import pandas as pd
import re
import fitz  # PyMuPDF
import os

def parse_txt_sales_report(file_path):
    """
    Your confirmed working TXT parser.
    """
    customer_pattern = re.compile(r"^\x1bE?(.+?)\x1bF$")
    data_pattern = re.compile(
        r"^\s*(\d+)\s+"                       # Group 1: BILLNO
        r"(\d{2}-\d{2}-\d{4})\s+"            # Group 2: DATE
        r"(.+?)\s+"                          # Group 3: The entire middle part
        r"([\d.]+)\s+"                       # Group 4: PTR
        r"([\d.]+)\s+"                       # Group 5: NFREE
        r"([\d.]*)\s+"                       # Group 6: FREE (can be empty)
        r"([\d.]+)$"                         # Group 7: VALUE
    )
    expiry_pattern = re.compile(r"([A-Za-z]{3}-\d{2})$")
    extracted_data = []
    current_customer = "Unknown"
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                clean_line = line.strip()
                if not clean_line: continue
                customer_match = customer_pattern.match(clean_line)
                if customer_match:
                    current_customer = customer_match.group(1).strip()
                    continue
                data_match = data_pattern.match(clean_line)
                if data_match:
                    bill_no, date, middle_chunk, ptr, nfree, free, value = data_match.groups()
                    item_name, batch_no, expiry = "Unknown", "N/A", "N/A"
                    expiry_match = expiry_pattern.search(middle_chunk)
                    if expiry_match:
                        expiry = expiry_match.group(1)
                        item_batch_part = middle_chunk[:expiry_match.start()].strip()
                    else:
                        item_batch_part = middle_chunk
                    if ' ' in item_batch_part:
                        parts = item_batch_part.rsplit(None, 1); item_name, batch_no = parts
                    else: item_name = item_batch_part
                    extracted_data.append({
                        "CustomerName": current_customer, "BillNo": bill_no.strip(), "Date": date.strip(),
                        "ItemName": item_name.strip(), "BatchNo": batch_no.strip(), "Expiry": expiry.strip(),
                        "PTR": float(ptr), "NFREE": int(float(nfree)) if nfree.strip() else 0,
                        "FREE": int(float(free)) if free.strip() else 0, "Value": float(value), "Region": "Thrissur"
                    })
    except Exception as e:
        print(f"A critical error occurred while parsing the TXT file: {e}")
        return None
    return extracted_data

def parse_pdf_sales_report(pdf_path):
    """
    Your confirmed working PDF parser.
    """
    def extract_text_from_pdf(path):
        try:
            with fitz.open(path) as doc: return "".join(page.get_text("text") for page in doc)
        except Exception as e:
            print(f"Error reading PDF file at '{path}': {e}"); return None
    distributor, manufacturer, records = "M/S.PECHIYAPPA CHEMICALS", "SHIRR PHARMACEUTICALA Pvt Ltd", []
    current_customer, current_area = "Unknown", "Unknown"
    try:
        raw_text = extract_text_from_pdf(pdf_path)
        if not raw_text: return None
        lines = [line.strip() for line in raw_text.strip().split('\n') if line.strip()]
        i = 0
        while i < len(lines):
            line = lines[i]
            if line == "Customer" and i > 0: current_customer = lines[i-1]; i += 1; continue
            if line == "Area" and i > 0: current_area = lines[i-1]; i += 1; continue
            if line == "Cus. Total": i += 2; continue
            is_start_of_record = (i + 1 < len(lines)) and re.match(r"^\d{2}/\d{2}/\d{2}$", lines[i+1]) and "Customer" not in lines[i] and "Area" not in lines[i]
            if is_start_of_record:
                try:
                    ItemName, date, pack_size = lines[i], lines[i+1], lines[i+2]
                    num_block_end_idx = i + 3
                    while num_block_end_idx < len(lines) and not lines[num_block_end_idx].startswith("P25"): num_block_end_idx += 1
                    if num_block_end_idx >= len(lines): i += 1; continue
                    bill_no = lines[num_block_end_idx]
                    number_lines = [n.replace(',', '') for n in lines[i+3:num_block_end_idx]]
                    qty, free_qty, value, rate = 0.0, 0.0, 0.0, 0.0
                    if len(number_lines) == 4: qty, free_qty, value, rate = map(float, number_lines)
                    elif len(number_lines) == 3: qty, value, rate = map(float, number_lines); free_qty = 0.0
                    else: i += 1; continue
                    mrp_block_end_idx = num_block_end_idx + 1
                    while mrp_block_end_idx < len(lines) and manufacturer not in lines[mrp_block_end_idx]: mrp_block_end_idx += 1
                    if mrp_block_end_idx >= len(lines): i += 1; continue
                    mrp = [float(n.replace(',', '')) for n in lines[num_block_end_idx + 1:mrp_block_end_idx] if re.match(r'^-?[\d,.]+$', n)]
                    i = mrp_block_end_idx
                    records.append({
                        "Distributor": distributor, "Area": current_area, "CustomerName": current_customer,
                        "ItemName": ItemName, "Manufacturer": manufacturer, "Date": date, "BillNo": bill_no,
                        "Pack_Size": pack_size, "Quantity": int(qty), "FREE": int(free_qty), "PTR": rate,
                        "Value": value, "MRP": mrp[0] if mrp else 0.0,
                    })
                    continue
                except (IndexError, ValueError) as e: i += 1
            else: i += 1
    except Exception as e:
        print(f"A critical error occurred while parsing the PDF file: {e}"); return None
    return records

def parse_sales_file(file_path):
    """
    Bridge function: Calls the correct parser and standardizes its output
    to perfectly match the Django SalesTransaction model.
    """
    file_extension = os.path.splitext(file_path)[1].lower()
    raw_data = None
    print(f"Processing file: {file_path} (Type: {file_extension})")

    if file_extension == '.txt':
        raw_data = parse_txt_sales_report(file_path)
    elif file_extension == '.pdf':
        raw_data = parse_pdf_sales_report(pdf_path=file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_extension}")

    if not raw_data:
        print("Parsing returned no data.")
        return pd.DataFrame()

    df = pd.DataFrame(raw_data)

    # --- Standardize Dates ---
    if file_extension == '.txt':
        df['Date'] = pd.to_datetime(df['Date'], format='%d-%m-%Y', errors='coerce')
    elif file_extension == '.pdf':
        df['Date'] = pd.to_datetime(df['Date'], format='%d/%m/%y', errors='coerce')
    df.dropna(subset=['Date'], inplace=True)

    # --- Standardize Column Names ---
    column_rename_map = {
        'CustomerName': 'customer_name', 'BillNo': 'bill_no', 'Date': 'date', 'ItemName': 'item_name',
        'BatchNo': 'batch_no', 'Expiry': 'expiry', 'PTR': 'ptr', 'Value': 'value',
        'NFREE': 'quantity', 'Region': 'area', # TXT specific
        'Quantity': 'quantity', 'FREE': 'free_quantity', 'Area': 'area', # PDF specific
        'Distributor': 'distributor', 'Manufacturer': 'manufacturer', 'Pack_Size': 'pack_size', 'MRP': 'mrp',
        'Product_Discount_Percent': 'product_discount_percent', 'Discount_Amount': 'discount_amount',
        'Customer_Discount_Percent': 'customer_discount_percent'
    }
    df.rename(columns=column_rename_map, inplace=True)

    # --- Ensure all model columns exist ---
    model_columns = [
        'customer_name', 'item_name', 'date', 'bill_no', 'quantity', 'free_quantity', 'ptr', 'value',
        'batch_no', 'expiry', 'area', 'distributor', 'manufacturer', 'pack_size', 'mrp',
        'product_discount_percent', 'discount_amount', 'customer_discount_percent'
    ]
    for col in model_columns:
        if col not in df.columns:
            if 'quantity' in col or 'percent' in col or 'amount' in col or 'ptr' in col or 'mrp' in col:
                df[col] = 0
            else:
                df[col] = ''
    
    # Select only the columns that match the model
    df = df[model_columns]

    print(f"Successfully parsed and standardized {len(df)} records.")
    return df