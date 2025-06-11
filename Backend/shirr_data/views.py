import os
import pandas as pd
import re
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.core.files.storage import default_storage
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .forms import UploadFileForm
from . import txt_parser

# ==============================================================================
# HELPER FUNCTION FOR DATA PREPARATION
# ==============================================================================

def _prepare_dataframe(request):
    """
    Retrieves data from session, normalizes column names, cleans the data,
    and returns a single, clean Pandas DataFrame ready for analysis.
    This version is robustly designed to handle combined data from both
    TXT and PDF parsers with different columns and date formats.
    """
    sales_data = request.session.get('sales_data', [])
    if not sales_data:
        print("DEBUG: No sales data found in session. Returning empty DataFrame.")
        return pd.DataFrame()

    df = pd.DataFrame(sales_data)
    print(f"DEBUG: Initial combined DataFrame shape: {df.shape}")
    print(f"DEBUG: Initial combined columns: {df.columns.tolist()}")

    column_map = {
        'CustomerName': 'customer_name', 'BillNo': 'bill_no', 'Date': 'date',
        'ItemName': 'item_name', 'PTR': 'ptr', 'Value': 'value',
        'Region': 'region', 'Quantity': 'quantity', 'Quantity_Free': 'quantity_free',
        'BatchNo': 'batch_no', 'Expiry': 'expiry', 'Distributor': 'distributor',
        'Manufacturer': 'manufacturer', 'Pack_Size': 'pack_size', 'MRP': 'mrp',
        'Product_Discount_Percent': 'product_discount_percent',
        'Discount_Amount': 'discount_amount', 'Customer_Discount_Percent': 'customer_discount_percent'
    }
    df.rename(columns=column_map, inplace=True)
    
    standard_columns = {
        'customer_name': '', 'bill_no': '', 'date': None, 'item_name': '',
        'batch_no': '', 'expiry': '', 'pack_size': '', 'distributor': '',
        'manufacturer': '', 'region': 'Unknown',
        'quantity': 0, 'quantity_free': 0, 'ptr': 0.0, 'value': 0.0, 'mrp': 0.0,
        'product_discount_percent': 0.0, 'discount_amount': 0.0,
        'customer_discount_percent': 0.0
    }
    for col, default_value in standard_columns.items():
        if col not in df.columns:
            df[col] = default_value

    original_dates = df['date'].copy()
    df['date'] = pd.to_datetime(df['date'], format='%d-%m-%Y', errors='coerce')
    failed_mask = df['date'].isna()
    if failed_mask.any():
        df.loc[failed_mask, 'date'] = pd.to_datetime(original_dates[failed_mask], format='%d/%m/%Y', errors='coerce')

    initial_count = len(df)
    df.dropna(subset=['date'], inplace=True)
    if initial_count > len(df):
        print(f"WARNING: Dropped {initial_count - len(df)} rows due to unparseable dates.")

    string_cols = ['customer_name', 'bill_no', 'item_name', 'batch_no', 'expiry', 'pack_size', 'distributor', 'manufacturer', 'region']
    for col in string_cols:
        df[col] = df[col].fillna('').astype(str)

    date_pattern_mask = df['customer_name'].str.match(r'^\d{2}[-/]\d{2}[-/]\d{2,4}$')
    if date_pattern_mask.any():
        df = df[~date_pattern_mask]

    numeric_cols = ['quantity', 'quantity_free', 'ptr', 'value', 'mrp', 'product_discount_percent', 'discount_amount', 'customer_discount_percent']
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    # Convert integer-like columns to standard Python int
    df['quantity'] = df['quantity'].astype(int)
    df['quantity_free'] = df['quantity_free'].astype(int)
    
    print(f"\nDEBUG: Final DataFrame shape after all cleaning: {df.shape}")
    return df


# ==============================================================================
# HELPER FUNCTIONS FOR DATA ANALYSIS
# ==============================================================================

def _get_sales_trends_by_area(df):
    if df.empty or 'region' not in df.columns or 'date' not in df.columns: return {}
    df['week'] = df['date'].dt.to_period('W').astype(str)
    trends = df.groupby(['region', 'week'])['value'].sum().unstack(fill_value=0)
    result = {}
    for area, row in trends.iterrows():
        result[area] = {
            'labels': row.index.tolist(),
            'data': [round(float(v), 2) for v in row.values]
        }
    return result

def _get_top_medicines_by_area(df, top_n=5):
    if df.empty or 'region' not in df.columns: return {}
    top_items = df.groupby(['region', 'item_name'])['value'].sum().groupby('region', group_keys=False).nlargest(top_n)
    chart_data = {}
    for (area, item), value in top_items.items():
        if area not in chart_data: chart_data[area] = {'labels': [], 'data': []}
        chart_data[area]['labels'].append(item)
        chart_data[area]['data'].append(round(float(value), 2))
    return chart_data

def _get_growing_medicines(df):
    if df.empty or 'date' not in df.columns or df['date'].dt.month.nunique() < 2:
        return {'message': "Analysis requires data from at least two different months."}
    df['month'] = df['date'].dt.to_period('M')
    sales = df.groupby(['item_name', 'month'])['value'].sum().unstack(fill_value=0)
    if sales.shape[1] < 2:
        return {'message': "Not enough monthly data to compare."}
    last_month, prev_month = sales.columns.max(), sales.columns.max() - 1
    if prev_month not in sales.columns:
        return {'message': "Data for the previous month is missing."}
        
    growing = sales[sales[last_month] > sales[prev_month]].copy()
    growing.sort_values(by=last_month, ascending=False, inplace=True)
    
    return {
        'labels': growing.index.tolist(), 
        'last_month_sales': [round(float(v), 2) for v in growing[last_month]], 
        'prev_month_sales': [round(float(v), 2) for v in growing[prev_month]]
    }

def _get_prescriber_analysis(df, top_n=15):
    if df.empty or 'customer_name' not in df.columns: return {}
    prescribers = df.groupby('customer_name')['value'].sum().nlargest(top_n)
    return {
        'labels': prescribers.index.tolist(), 
        'data': [round(float(v), 2) for v in prescribers.values]
    }

def _get_high_free_quantity_products(df, top_n=15):
    if df.empty or 'quantity_free' not in df.columns or df['quantity_free'].sum() == 0: return {}
    free_items = df.groupby('item_name')['quantity_free'].sum().nlargest(top_n)
    free_items = free_items[free_items > 0]
    return {
        'labels': free_items.index.tolist(), 
        'data': [int(v) for v in free_items.values]
    }

# ==============================================================================
# DJANGO VIEWS
# ==============================================================================

@csrf_exempt
@require_http_methods(["POST"])
def upload_file_api(request):
    """Handle file upload for analytics data"""
    try:
        if 'file' not in request.FILES:
            return APIResponse.error("No file provided", 400)
        
        uploaded_file = request.FILES['file']
        
        # Validate file type
        allowed_extensions = ['.csv', '.xlsx', '.xls']
        file_extension = os.path.splitext(uploaded_file.name)[1].lower()
        if file_extension not in allowed_extensions:
            return APIResponse.error("Invalid file type. Only CSV and Excel files are allowed.", 400)
        
        # Save file temporarily
        temp_file_name = default_storage.save(uploaded_file.name, uploaded_file)
        temp_file_path = default_storage.path(temp_file_name)
        
        try:
            # Parse the file based on extension
            if file_extension == '.csv':
                df_parsed = pd.read_csv(temp_file_path)
            else:
                df_parsed = pd.read_excel(temp_file_path)
            
            if df_parsed is not None and not df_parsed.empty:
                # Convert to records and store in session
                new_data = df_parsed.to_dict('records')
                existing_data = request.session.get('analytics_data', [])
                request.session['analytics_data'] = existing_data + new_data
                request.session['last_upload'] = datetime.now().isoformat()
                
                return APIResponse.success({
                    'records_added': len(new_data),
                    'total_records': len(existing_data) + len(new_data),
                    'filename': uploaded_file.name
                }, f"Successfully processed {len(new_data)} records")
            else:
                return APIResponse.error("Could not parse any valid records from the file", 400)
                
        except Exception as e:
            logger.error(f"Error parsing file: {str(e)}")
            return APIResponse.error(f"Error parsing file: {str(e)}", 500)
        
        finally:
            # Clean up temporary file
            if default_storage.exists(temp_file_name):
                default_storage.delete(temp_file_name)
    
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return APIResponse.error(f"Upload failed: {str(e)}", 500)




def clear_session_data_view(request):
    if 'sales_data' in request.session:
        del request.session['sales_data']
        messages.info(request, "Session data has been cleared. You can start a new analysis.")
    return redirect('upload_file')

def sales_data_api(request):
    df = _prepare_dataframe(request)

    dashboard_data = {
        'salesTrendsByArea': _get_sales_trends_by_area(df),
        'topMedicinesByArea': _get_top_medicines_by_area(df),
        'growingMedicines': _get_growing_medicines(df),
        'prescriberAnalysis': _get_prescriber_analysis(df),
        'repPerformance': {'error': "Data for Medical Representative performance is not available."},
        'highFreeQuantity': _get_high_free_quantity_products(df),
        'totalRecords': len(df),
    }
    
    return JsonResponse(dashboard_data)