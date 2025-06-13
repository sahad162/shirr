import pandas as pd
import csv
import re
try:
    import fitz 
except ImportError:
    fitz = None
import os

def parse_txt_sales_report(file_path):
    """
    Parses a customer-wise sales report from a text file and extracts transaction data.
    The output dictionary uses standardized keys.
    """
    customer_pattern = re.compile(r"^\x1bE?(.+?)\x1bF$")
    data_pattern = re.compile(
        r"^\s*(\d+)\s+"                      # BILLNO
        r"(\d{2}-\d{2}-\d{4})\s+"            # DATE
        r"(.+?)\s{2,}"                       # ITEMNAME
        r"(.+?)"                             # BATCHNO
        r"([A-Za-z]{3}-\d{2})\s+"            # EXPIRY
        r"([\d.]+)\s+"                       # PTR
        r"([\d.]+)\s*"                       # QUANTITY_NFREE
        r"([\d.]*)\s+"                       # QUANTITY_FREE
        r"([\d.]+)$"                         # VALUE
    )

    extracted_data = []
    current_customer = "Unknown"

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                clean_line = line.strip()
                if not clean_line:
                    continue

                customer_match = customer_pattern.match(clean_line)
                if customer_match:
                    current_customer = customer_match.group(1).strip()
                    continue

                data_match = data_pattern.match(clean_line)
                if data_match:
                    (bill_no, date, item_name, batch_no, expiry,
                     ptr, nfree, free, value) = data_match.groups()

                    extracted_data.append({
                        "CustomerName": current_customer,
                        "BillNo": bill_no.strip(),
                        "Date": date.strip(),
                        "ItemName": item_name.strip(),
                        "BatchNo": batch_no.strip(),
                        "Expiry": expiry.strip(),
                        "PTR": float(ptr),
                        "Quantity": int(float(nfree)) if nfree else 0,
                        "Quantity_Free": int(float(free)) if free else 0,
                        "Value": float(value),
                        "Region": "Thrissur"
                    })

    except FileNotFoundError:
        print(f"Error: The file '{file_path}' was not found.")
        return None
    except Exception as e:
        print(f"An error occurred during parsing on line: '{clean_line}'\nError: {e}")
        return None

    return extracted_data

def parse_pdf_sales_report(pdf_path):
    """
    Parses a customer-wise sales report from a PDF file.
    The output dictionary uses standardized keys.
    """
    if not fitz:
        print("Error: PyMuPDF (fitz) is not installed. Cannot parse PDF files.")
        return None
        
    def extract_text_from_pdf(pdf_path):
        if not os.path.exists(pdf_path):
            print(f"File not found at: '{os.path.abspath(pdf_path)}'")
            return None
        try:
            doc = fitz.open(pdf_path)
            full_text = ""
            for page in doc:
                full_text += page.get_text("text")
            doc.close()
            return full_text
        except Exception as e:
            print(f"Error opening or reading the PDF file: {e}")
            return None

    distributor = "M/S.PECHIYAPPA CHEMICALS"
    manufacturer = "SHIRR PHARMACEUTICALA Pvt Ltd"

    current_customer = "Unknown"
    current_area = "Unknown"

    records = []
    raw_text = extract_text_from_pdf(pdf_path)
    if not raw_text:
        return None

    lines = [line.strip() for line in raw_text.strip().split('\n') if line.strip()]
    i = 0
    while i < len(lines):
        line = lines[i]

        if line == "Customer":
            if i > 0: current_customer = lines[i-1]
            i += 1
            continue
        if line == "Area":
            if i > 0: current_area = lines[i-1]
            i += 1
            continue
        if line == "Cus. Total":
            i += 2
            continue

        is_start_of_record = False
        if (i + 1) < len(lines) and re.match(r"^\d{2}/\d{2}/\d{2}$", lines[i+1]):
            if "Customer" not in lines[i] and "Area" not in lines[i]:
                is_start_of_record = True

        if is_start_of_record:
            try:
                ItemName = lines[i]
                date_raw = lines[i+1]
                
                if re.match(r"^\d{2}/\d{2}/\d{2}$", date_raw):
                    day, month, year = date_raw.split('/')

                    full_year = f"20{year}" if int(year) <= 30 else f"19{year}"
                    date = f"{day}/{month}/{full_year}"
                else:
                    date = date_raw
                
                pack_size = lines[i+2]

                num_block_end_idx = i + 3
                while num_block_end_idx < len(lines) and not lines[num_block_end_idx].startswith("P25"):
                    num_block_end_idx += 1
                
                if num_block_end_idx >= len(lines):
                    i += 1
                    continue
                    
                bill_no = lines[num_block_end_idx]
                number_lines = [n.replace(',', '') for n in lines[i+3:num_block_end_idx]]
                
                # Process numeric values with better error handling
                qty, free_qty, rate, value = 0, 0, 0.0, 0.0

                try:
                    numeric_values = [float(n) for n in number_lines if n.strip()]

                    if len(numeric_values) >= 3:
                        qty = int(numeric_values[0])
                        if len(numeric_values) > 3:
                            free_qty = int(numeric_values[1])
                            value = numeric_values[-2]
                            rate = numeric_values[-1]
                        else:
                            value = numeric_values[-2]
                            rate = numeric_values[-1]
                    else:
                        i += 1
                        continue
                        
                except (ValueError, IndexError):
                    i += 1
                    continue

                mrp_block_end_idx = num_block_end_idx + 1
                while mrp_block_end_idx < len(lines) and manufacturer not in lines[mrp_block_end_idx]:
                    mrp_block_end_idx += 1
                
                if mrp_block_end_idx >= len(lines):
                    i += 1
                    continue
                    
                manufacturer_line_idx = mrp_block_end_idx

                mrp_and_discount_lines = lines[num_block_end_idx + 1:manufacturer_line_idx]
                all_discount_nums = [float(line_text) for line_text in mrp_and_discount_lines if re.match(r'^-?\d+(\.\d+)?$', line_text.strip())]

                mrp = all_discount_nums[0] if all_discount_nums else 0.0
                product_discounts = all_discount_nums[1:]

                p_dis_percent = 0.0
                dis_amt = 0.0
                if len(product_discounts) == 1:
                    dis_amt = product_discounts[0]
                elif len(product_discounts) >= 2:
                    p_dis_percent = product_discounts[0]
                    dis_amt = product_discounts[1]

                c_dis_percent = 0.0
                if (manufacturer_line_idx + 1 < len(lines)) and re.match(r"^[ \d\.]+$", lines[manufacturer_line_idx + 1]):
                    try:
                        c_dis_percent = float(lines[manufacturer_line_idx + 1])
                        i = manufacturer_line_idx + 1
                    except ValueError:
                        i = manufacturer_line_idx
                else:
                    i = manufacturer_line_idx

                records.append({
                    "Distributor": distributor,
                    "Region": current_area,
                    "CustomerName": current_customer,
                    "ItemName": ItemName,
                    "Manufacturer": manufacturer,
                    "Date": date,
                    "BillNo": bill_no,
                    "Pack_Size": pack_size,
                    "Quantity": qty,
                    "Quantity_Free": free_qty,
                    "PTR": rate,
                    "Value": value,
                    "MRP": mrp,
                    "Product_Discount_Percent": p_dis_percent,
                    "Discount_Amount": dis_amt,
                    "Customer_Discount_Percent": c_dis_percent
                })
                continue
            except (IndexError, ValueError) as e:
                i += 1
        else:
            i += 1

    print(f"DEBUG: PDF parser extracted {len(records)} records")
    return records

def parse_sales_file(file_path):
    """
    Determines the file type, parses the sales data, and returns a 
    single, standardized DataFrame.
    """
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' does not exist.")
        return None

    file_extension = os.path.splitext(file_path)[1].lower()
    data = None
    
    if file_extension == '.txt':
        data = parse_txt_sales_report(file_path)
    elif file_extension == '.pdf':
        data = parse_pdf_sales_report(file_path)
    else:
        print(f"Unsupported file type: {file_extension}. Please provide a .txt or .pdf file.")
        return None

    if data:
        df = pd.DataFrame(data)
        print(f"DEBUG: Created DataFrame with {len(df)} records and columns: {df.columns.tolist()}")
        return df
    else:
        print(f"No data extracted from {file_path}.")
        return pd.DataFrame() # Return empty DataFrame instead of None