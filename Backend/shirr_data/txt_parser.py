import pandas as pd
import re
import fitz  # PyMuPDF
import os
from datetime import datetime

# ==============================================================================
# TXT, PDF, CSV, and Excel Format 1 & 2 Parsers (Unchanged)
# ==============================================================================
def parse_txt_sales_report(file_path):
    # ... (Your existing TXT parser code is unchanged) ...
    customer_pattern = re.compile(r"^\x1bE?(.+?)\x1bF$")
    data_pattern = re.compile(
        r"^\s*(\d+)\s+" r"(\d{2}-\d{2}-\d{4})\s+" r"(.+?)\s+" r"([\d.]+)\s+" 
        r"([\d.]+)\s+" r"([\d.]*)\s+" r"([\d.]+)$" 
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
    # ... (Your existing PDF parser code is unchanged) ...
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

def parse_csv_sales_report(file_path):
    # ... (Your existing CSV parser code is unchanged) ...
    try:
        df = pd.read_csv(file_path)
        print("CSV Format identified. Starting parse...")
        rename_map = {
            'Customer': 'CustomerName', 'Bill': 'BillNo', 'TransactionDate': 'Date',
            'Product': 'ItemName', 'Batch': 'BatchNo', 'ExpiryDate': 'Expiry',
            'Rate': 'PTR', 'SaleQty': 'Quantity', 'FreeQty': 'FREE',
            'Amount': 'Value', 'Territory': 'Region'
        }
        df.rename(columns=rename_map, inplace=True)
        return df.to_dict('records')
    except Exception as e:
        print(f"Could not read or parse CSV file: {e}")
        return None

def parse_excel_sales_report_format1(file_path):
    # ... (Your existing Excel format 1 parser code is unchanged) ...
    try: df_raw = pd.read_excel(file_path, header=None)
    except Exception as e: print(f"Could not read excel file: {e}"); return None
    expected_identifiers = ["bill no", "product name"]
    header_row_index = -1
    header_row_values = []
    for i, row in df_raw.iterrows():
        if not row.isnull().all():
            row_values = [str(v).lower().strip() for v in row.values if pd.notna(v)]
            if all(identifier in row_values for identifier in expected_identifiers):
                header_row_index, header_row_values = i, row.values
                break
    if header_row_index == -1: return None
    header_map = {str(h).strip().lower().replace(' ', '').replace('.', ''): idx for idx, h in enumerate(header_row_values) if pd.notna(h)}
    try:
        bill_no_idx, date_idx, item_name_idx = header_map['billno'], header_map['date'], header_map['productname']
        ptr_idx, qty_idx, value_idx = header_map['selrate'], header_map['qty'], header_map['amount']
        free_qty_idx = header_map.get('freeqty')
    except KeyError as e: print(f"Critical Error: Missing essential column in Excel header - {e}. Cannot parse file."); return None
    initial_data, current_customer, current_manufacturer = [], "Unknown", "Unknown"
    for i, row in df_raw.iloc[header_row_index + 1:].iterrows():
        if row.isnull().all(): continue
        first_cell, product_cell = str(row.iloc[0]).strip(), str(row.iloc[item_name_idx]).strip() if pd.notna(row.iloc[item_name_idx]) else ""
        if product_cell.startswith("Company -"): current_manufacturer = product_cell.replace("Company -", "").strip()
        elif first_cell.lower() == 'sub total': continue
        elif re.match(r'^\d+(\.\d+)?$', first_cell):
            try:
                free_qty = int(float(row.iloc[free_qty_idx])) if free_qty_idx is not None and pd.notna(row.iloc[free_qty_idx]) and str(row.iloc[free_qty_idx]).strip() else 0
                initial_data.append({
                    "CustomerName": current_customer, "Manufacturer": current_manufacturer, "BillNo": str(row.iloc[bill_no_idx]).strip(), 
                    "Date": pd.to_datetime(row.iloc[date_idx]), "ItemName": str(row.iloc[item_name_idx]).strip(), "PTR": float(row.iloc[ptr_idx]),
                    "Quantity": int(float(row.iloc[qty_idx])), "FREE": free_qty, "Value": float(row.iloc[value_idx]), "Region": "INTERNATIONAL"
                })
            except (ValueError, IndexError, TypeError) as e: print(f"Skipping malformed Excel row {i+1}: {e}")
        else:
            non_empty_cells = [str(c).strip() for c in row if pd.notna(c) and str(c).strip() != '']
            if non_empty_cells: current_customer = ' '.join(non_empty_cells).replace('-', '').strip()
    if not initial_data: return None
    df_extracted = pd.DataFrame(initial_data)
    agg_keys = ['CustomerName', 'BillNo', 'Date', 'ItemName', 'PTR', 'Region', 'Manufacturer']
    df_aggregated = df_extracted.groupby(agg_keys).agg({'Quantity': 'sum', 'FREE': 'sum', 'Value': 'sum'}).reset_index()
    df_aggregated['Date'] = df_aggregated['Date'].dt.strftime('%d-%m-%Y')
    return df_aggregated.to_dict('records')

def parse_excel_sales_report_format2(file_path):
    # ... (Your existing Excel format 2 parser code is unchanged) ...
    try:
        df = pd.read_excel(file_path, header=0)
    except Exception as e:
        print(f"Could not read excel file (Format 2): {e}")
        return None
    rename_map = {
        'date': 'Date', 'name of party': 'CustomerName', 'invoice no.': 'BillNo',
        'product': 'ItemName', 'pack': 'Pack_Size', 'batch': 'BatchNo', 'expiry': 'Expiry',
        'qty': 'Quantity', 'free': 'FREE', 'rate': 'PTR', 'value': 'Value', 'mrp': 'MRP',
        'manufacturer': 'Manufacturer',
    }
    df.columns = [str(col).lower().strip() for col in df.columns]
    required_cols = ['date', 'invoice no.', 'product', 'value']
    if not all(col in df.columns for col in required_cols):
        print("Excel Format 2 check failed: Missing one of the required columns:", required_cols)
        return None
    df.rename(columns=rename_map, inplace=True)
    df.dropna(subset=['Date', 'BillNo', 'ItemName'], inplace=True)
    for col in ['Quantity', 'FREE', 'PTR', 'Value', 'MRP']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        else:
            df[col] = 0
    return df.to_dict('records')


# ==============================================================================
# --- CORRECTED --- EXCEL PARSER (FORMAT 3)
# ==============================================================================
def parse_excel_sales_report_format3(file_path):
    """
    Parses an Excel format that has multiple header lines before the actual data.
    It dynamically finds the header row containing 'Sl.No', 'Date', 'Customer', etc.
    """
    try:
        df_raw = pd.read_excel(file_path, header=None)
    except Exception as e:
        print(f"Could not read excel file (Format 3 Raw): {e}")
        return None

    header_row_index = -1
    expected_headers = ['sl.no', 'date', 'customer', 'route', 'product name']
    for i, row in df_raw.iterrows():
        row_values = [str(v).lower().strip() for v in row if pd.notna(v)]
        if all(h in row_values for h in expected_headers):
            header_row_index = i
            break
            
    if header_row_index == -1:
        print("Could not find the header row in Excel Format 3. Parsing aborted.")
        return None

    try:
        df = pd.read_excel(file_path, header=header_row_index)
    except Exception as e:
        print(f"Error reading Excel file with dynamic header at row {header_row_index}: {e}")
        return None

    # --- THIS IS THE CORRECTED PART ---
    # The keys here MUST match the column names AFTER normalization.
    rename_map = {
        'date': 'Date',
        'customer': 'CustomerName',
        'route': 'Area',
        'productname': 'ItemName', # Corrected: 'product name' -> 'productname'
        'company': 'Manufacturer',
        'batch': 'BatchNo',
        'pack': 'Pack_Size',
        'sqty': 'Quantity', # Corrected: 's.qty' -> 'sqty'
        'mrp': 'MRP',       # Corrected: 'm.r.p' -> 'mrp'
        'srate': 'PTR',     # Corrected: 's.rate' -> 'srate'
        'total': 'Value',
    }
    
    # Normalize column headers consistently
    df.columns = [str(col).lower().strip().replace('.', '').replace(' ', '') for col in df.columns]
    df.rename(columns=rename_map, inplace=True)
    
    # Drop rows that are likely footers or completely empty
    df.dropna(subset=['Date', 'CustomerName', 'ItemName'], how='all', inplace=True)
    # Specifically ensure that a product name exists, otherwise the row is useless
    df.dropna(subset=['ItemName'], inplace=True)
    
    df['BillNo'] = 'N/A'
    for col in ['Quantity', 'FREE', 'PTR', 'Value', 'MRP']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        else:
            df[col] = 0
            
    return df.to_dict('records')


# ==============================================================================
# FINAL, UNIFIED BRIDGE FUNCTION (Unchanged)
# ==============================================================================
def parse_sales_file(file_path):
    """
    Bridge function: Detects file type, calls the correct parser, and standardizes output.
    Includes auto-detection for different Excel formats with robust header normalization.
    """
    file_extension = os.path.splitext(file_path)[1].lower()
    raw_data = None
    print(f"Processing file: {file_path} (Type: {file_extension})")

    if file_extension == '.txt':
        raw_data = parse_txt_sales_report(file_path)
    elif file_extension == '.pdf':
        raw_data = parse_pdf_sales_report(file_path)
    elif file_extension == '.csv':
        raw_data = parse_csv_sales_report(file_path)
    
    elif file_extension in ['.xlsx', '.xls']:
        try:
            df_peek = pd.read_excel(file_path, header=None, nrows=20)
            
            def normalize_header(header_str):
                return str(header_str).lower().replace(' ', '').replace('.', '')

            format1_identifiers = ["billno", "productname"]
            format2_identifiers = ["nameofparty", "invoiceno"]
            format3_identifiers = ["route", "sqty"]
            
            detected_format = None
            for i, row in df_peek.iterrows():
                row_values_normalized = [normalize_header(v) for v in row.values if pd.notna(v)]
                
                if all(id_val in row_values_normalized for id_val in format1_identifiers):
                    detected_format = 1
                    break
                if all(id_val in row_values_normalized for id_val in format2_identifiers):
                    detected_format = 2
                    break
                if all(id_val in row_values_normalized for id_val in format3_identifiers):
                    detected_format = 3
                    break
            
            if detected_format == 1:
                print("Excel format 1 detected (complex layout).")
                raw_data = parse_excel_sales_report_format1(file_path)
            elif detected_format == 2:
                print("Excel format 2 detected (standard table with 'name of party').")
                raw_data = parse_excel_sales_report_format2(file_path)
            elif detected_format == 3:
                print("Excel format 3 detected (dynamic header with 'route').")
                raw_data = parse_excel_sales_report_format3(file_path)
            else:
                print("Could not determine Excel file format. No matching parser found.")
                return pd.DataFrame()

        except Exception as e:
            # This catch-all is what printed the misleading error message.
            print(f"An error occurred during parsing: {e}")
            return pd.DataFrame()
            
    else:
        print(f"No parser available for unsupported file type: {file_extension}. It will be stored only.")
        return pd.DataFrame()

    if not raw_data:
        print("Parsing returned no data.")
        return pd.DataFrame()

    df = pd.DataFrame(raw_data)
    if df.empty:
        return df

    df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
    df.dropna(subset=['Date'], inplace=True)

    column_rename_map = {
        'CustomerName': 'customer_name', 'BillNo': 'bill_no', 'Date': 'date', 'ItemName': 'item_name',
        'BatchNo': 'batch_no', 'Expiry': 'expiry', 'PTR': 'ptr', 'Value': 'value',
        'NFREE': 'quantity', 'Region': 'area', 'Quantity': 'quantity', 'FREE': 'free_quantity', 
        'Area': 'area', 'Distributor': 'distributor', 'Manufacturer': 'manufacturer', 
        'Pack_Size': 'pack_size', 'MRP': 'mrp',
    }
    df.rename(columns=column_rename_map, inplace=True)

    model_columns = [
        'customer_name', 'item_name', 'date', 'bill_no', 'quantity', 'free_quantity', 'ptr', 'value',
        'batch_no', 'expiry', 'area', 'distributor', 'manufacturer', 'pack_size', 'mrp',
        'product_discount_percent', 'discount_amount', 'customer_discount_percent'
    ]
    for col in model_columns:
        if col not in df.columns:
            if any(s in col for s in ['quantity', 'percent', 'amount', 'ptr', 'mrp', 'value']):
                df[col] = 0
            else:
                df[col] = None

    df = df[model_columns]
    print(f"Successfully parsed and standardized {len(df)} records from {os.path.basename(file_path)}.")
    return df