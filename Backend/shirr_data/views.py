import os
import re
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.core.files.storage import default_storage
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views.decorators.http import require_POST, require_GET
from . import txt_parser  
import pandas as pd
from .forms import UploadFileForm

# ==============================================================================
# HELPER FUNCTION FOR DATA PREPARATION
# ==============================================================================

def _prepare_dataframe_for_file(request, selected_file=None):
    """
    Retrieves data from session for a specific file or all files,
    normalizes column names, cleans the data, and returns a clean DataFrame.
    """
    # Get file-specific data from session
    files_data = request.session.get('files_data', {})
    
    if not files_data:
        print("DEBUG: No files data found in session.")
        return pd.DataFrame()
    
    # If specific file is requested
    if selected_file and selected_file != 'all_data':
        if selected_file not in files_data:
            print(f"DEBUG: File {selected_file} not found in session data.")
            return pd.DataFrame()
        sales_data = files_data[selected_file]['data']
        print(f"DEBUG: Using data from file: {selected_file}, Records: {len(sales_data)}")
    else:
        # Combine all files data
        sales_data = []
        for file_key, file_info in files_data.items():
            sales_data.extend(file_info['data'])
        print(f"DEBUG: Using combined data from all files, Total records: {len(sales_data)}")
    
    if not sales_data:
        return pd.DataFrame()

    df = pd.DataFrame(sales_data)
    print(f"DEBUG: Initial DataFrame shape: {df.shape}")
    print(f"DEBUG: Initial columns: {df.columns.tolist()}")

    # Column mapping for standardization
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
    
    # Ensure all required columns exist with default values
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

    # Handle date parsing
    if 'date' in df.columns and len(df) > 0:
        original_dates = df['date'].copy()
        # Try multiple date formats
        df['date'] = pd.to_datetime(df['date'], format='%d-%m-%Y', errors='coerce')
        failed_mask = df['date'].isna()
        if failed_mask.any():
            df.loc[failed_mask, 'date'] = pd.to_datetime(original_dates[failed_mask], format='%d/%m/%Y', errors='coerce')
        
        failed_mask = df['date'].isna()
        if failed_mask.any():
            df.loc[failed_mask, 'date'] = pd.to_datetime(original_dates[failed_mask], format='%Y-%m-%d', errors='coerce')

        # Remove rows with invalid dates
        initial_count = len(df)
        df.dropna(subset=['date'], inplace=True)
        if initial_count > len(df):
            print(f"WARNING: Dropped {initial_count - len(df)} rows due to unparseable dates.")

    # Clean string columns
    string_cols = ['customer_name', 'bill_no', 'item_name', 'batch_no', 'expiry', 'pack_size', 'distributor', 'manufacturer', 'region']
    for col in string_cols:
        if col in df.columns:
            df[col] = df[col].fillna('').astype(str)

    # Clean numeric columns
    numeric_cols = ['quantity', 'quantity_free', 'ptr', 'value', 'mrp', 'product_discount_percent', 'discount_amount', 'customer_discount_percent']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    # Convert to appropriate types
    if 'quantity' in df.columns:
        df['quantity'] = df['quantity'].astype(int)
    if 'quantity_free' in df.columns:
        df['quantity_free'] = df['quantity_free'].astype(int)
    
    print(f"DEBUG: Final DataFrame shape: {df.shape}")
    return df


# ==============================================================================
# HELPER FUNCTIONS FOR DATA ANALYSIS
# ==============================================================================

def _get_sales_trends_by_area(df):
    """Generate sales trends by area/region over time."""
    if df.empty or 'region' not in df.columns or 'date' not in df.columns or 'value' not in df.columns: 
        return {'labels': [], 'data': [], 'message': 'Required columns (region, date, value) not found'}
    
    try:
        df['week'] = df['date'].dt.to_period('W').astype(str)
        trends = df.groupby(['region', 'week'])['value'].sum().unstack(fill_value=0)
        
        if len(trends) > 0:
            # If multiple regions, sum them up (you can modify this logic)
            total_trends = trends.sum(axis=0)
            if len(total_trends) > 0:
                return {
                    'labels': total_trends.index.tolist(),
                    'data': [round(float(v), 2) for v in total_trends.values]
                }
        return {'labels': [], 'data': [], 'message': 'No sales trends data available'}
    except Exception as e:
        print(f"Error in sales trends: {str(e)}")
        return {'labels': [], 'data': [], 'message': f'Error processing sales trends: {str(e)}'}

def _get_top_medicines_by_area(df, top_n=10):
    """Get top selling medicines."""
    if df.empty or 'item_name' not in df.columns or 'value' not in df.columns:
        return {'labels': [], 'data': [], 'message': 'Required columns (item_name, value) not found'}
    
    try:
        top_items = df.groupby('item_name')['value'].sum().nlargest(top_n)
        
        if len(top_items) > 0:
            return {
                'labels': top_items.index.tolist(),
                'data': [round(float(v), 2) for v in top_items.values]
            }
        return {'labels': [], 'data': [], 'message': 'No medicine sales data available'}
    except Exception as e:
        print(f"Error in top medicines: {str(e)}")
        return {'labels': [], 'data': [], 'message': f'Error processing top medicines: {str(e)}'}

def _get_growing_medicines(df):
    """Find medicines with growing sales month over month."""
    if df.empty or 'date' not in df.columns or 'item_name' not in df.columns or 'value' not in df.columns:
        return {'labels': [], 'data': [], 'message': 'Required columns (date, item_name, value) not found'}
    
    try:
        if df['date'].dt.month.nunique() < 2:
            return {'labels': [], 'data': [], 'message': "Need data from at least two different months"}
        
        df['month'] = df['date'].dt.to_period('M')
        sales = df.groupby(['item_name', 'month'])['value'].sum().unstack(fill_value=0)
        
        if sales.shape[1] < 2:
            return {'labels': [], 'data': [], 'message': "Not enough monthly data for comparison"}
        
        months = sorted(sales.columns)
        last_month, prev_month = months[-1], months[-2]
        
        # Find growing medicines
        growing = sales[(sales[last_month] > sales[prev_month]) & (sales[prev_month] > 0)].copy()
        
        if len(growing) == 0:
            return {'labels': [], 'data': [], 'message': "No growing medicines found"}
        
        growing = growing.sort_values(by=last_month, ascending=False)
        
        return {
            'labels': growing.index.tolist()[:10],
            'data': [round(float(v), 2) for v in growing[last_month].head(10)],
            'prev_month_data': [round(float(v), 2) for v in growing[prev_month].head(10)]
        }
    except Exception as e:
        print(f"Error in growing medicines: {str(e)}")
        return {'labels': [], 'data': [], 'message': f'Error processing growing medicines: {str(e)}'}


# ==============================================================================
# DJANGO VIEWS
# ==============================================================================

@csrf_exempt
@require_POST
def api_file_upload_view(request):
    """
    Endpoint to upload report files.
    Stores each file's data separately in session.
    """
    try:
        uploaded_files = request.FILES.getlist('reports')
        
        if not uploaded_files:
            return JsonResponse({'error': 'No files uploaded'}, status=400)

        # Get existing files data from session
        files_data = request.session.get('files_data', {})
        upload_results = []

        for uploaded_file in uploaded_files:
            temp_file_name = None
            try:
                # Save uploaded file temporarily
                temp_file_name = default_storage.save(uploaded_file.name, uploaded_file)
                temp_file_path = default_storage.path(temp_file_name)
                
                print(f"DEBUG: Processing file: {uploaded_file.name}")
                
                # Parse the file
                df_parsed = txt_parser.parse_sales_file(temp_file_path)
                
                if df_parsed is not None and not df_parsed.empty:
                    # Convert to records and store file-specific data
                    file_data = df_parsed.to_dict('records')
                    
                    # Store file data with unique key
                    file_key = uploaded_file.name
                    files_data[file_key] = {
                        'filename': uploaded_file.name,
                        'data': file_data,
                        'records_count': len(file_data),
                        'upload_time': pd.Timestamp.now().isoformat()
                    }
                    
                    upload_results.append({
                        'file': uploaded_file.name,
                        'status': 'success',
                        'records_added': len(file_data)
                    })
                    
                    print(f"DEBUG: Successfully processed {uploaded_file.name}: {len(file_data)} records")
                else:
                    upload_results.append({
                        'file': uploaded_file.name,
                        'status': 'warning',
                        'message': 'No valid records found in file'
                    })
                    print(f"DEBUG: No valid data in {uploaded_file.name}")
                    
            except Exception as e:
                error_msg = f'Error processing {uploaded_file.name}: {str(e)}'
                print(f"DEBUG: {error_msg}")
                upload_results.append({
                    'file': uploaded_file.name,
                    'status': 'error',
                    'message': error_msg
                })
            finally:
                # Clean up temporary file
                if temp_file_name and default_storage.exists(temp_file_name):
                    try:
                        default_storage.delete(temp_file_name)
                    except Exception as e:
                        print(f"Error deleting temp file: {str(e)}")

        # Update session
        request.session['files_data'] = files_data
        request.session.modified = True
        
        # Calculate total records
        total_records = sum(file_info['records_count'] for file_info in files_data.values())
        
        return JsonResponse({
            'message': f'{len(uploaded_files)} file(s) processed',
            'results': upload_results,
            'total_files': len(files_data),
            'total_records': total_records
        }, status=200)
        
    except Exception as e:
        print(f"General upload error: {str(e)}")
        return JsonResponse({'error': f'Upload failed: {str(e)}'}, status=500)


@require_GET
def list_uploaded_reports(request):
    """
    Returns the list of uploaded files stored in session.
    """
    try:
        files_data = request.session.get('files_data', {})
        
        if not files_data:
            return JsonResponse({
                'reports': [],
                'has_data': False,
                'total_files': 0,
                'total_records': 0
            }, status=200)
        
        # Convert files_data to list format for frontend
        reports = []
        total_records = 0
        
        for file_key, file_info in files_data.items():
            reports.append({
                'key': file_key,
                'label': file_info['filename'],
                'records_count': file_info['records_count']
            })
            total_records += file_info['records_count']
        
        return JsonResponse({
            'reports': reports,
            'has_data': True,
            'total_files': len(files_data),
            'total_records': total_records
        }, status=200)
        
    except Exception as e:
        print(f"Error listing reports: {str(e)}")
        return JsonResponse({'error': f'Failed to list reports: {str(e)}'}, status=500)


@require_GET
def report_data_api(request):
    """
    API endpoint to get report data based on report type and selected file.
    """
    try:
        report_type = request.GET.get('report_type')
        selected_file = request.GET.get('selected_file', 'all_data')
        
        if not report_type:
            return JsonResponse({'error': 'report_type parameter is required'}, status=400)
        
        print(f"DEBUG: Generating report - Type: {report_type}, File: {selected_file}")
        
        # Get data for specific file or all files
        df = _prepare_dataframe_for_file(request, selected_file)
        
        if df.empty:
            return JsonResponse({
                'reportType': report_type,
                'selectedFile': selected_file,
                'data': {
                    'labels': [], 
                    'data': [], 
                    'message': 'No data available. Please upload files first.'
                }
            }, status=200)

        # Generate report based on type
        if report_type == 'salesTrendsByArea':
            data = _get_sales_trends_by_area(df)
        elif report_type == 'topMedicinesByArea':
            data = _get_top_medicines_by_area(df)
        elif report_type == 'growingMedicines':
            data = _get_growing_medicines(df)
        else:
            return JsonResponse({'error': f'Invalid report type: {report_type}'}, status=400)

        print(f"DEBUG: Report generated - Labels: {len(data.get('labels', []))}, Data points: {len(data.get('data', []))}")

        return JsonResponse({
            'reportType': report_type,
            'selectedFile': selected_file,
            'data': data
        }, status=200)
        
    except Exception as e:
        print(f"Error generating report: {str(e)}")
        return JsonResponse({'error': f'Error generating report: {str(e)}'}, status=500)