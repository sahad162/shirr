# views.py

import pandas as pd
from django.db import transaction
from django.http import JsonResponse, HttpResponse
from django.core.files.storage import default_storage
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.csrf import csrf_exempt
import os
from django.conf import settings
import json
import datetime
import traceback
from django.template.loader import render_to_string
from weasyprint import HTML

from . import txt_parser
from .models import SalesTransaction

# --- File Handling & Data Management Views ---

@csrf_exempt
@require_POST
def api_file_upload_view(request):
    """
    Handles file upload, calls the standardized parser, and saves to the database.
    """
    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return JsonResponse({'error': 'No file uploaded'}, status=400)

    temp_file_name = default_storage.save(uploaded_file.name, uploaded_file)
    temp_file_path = default_storage.path(temp_file_name)
    
    try:
        df_parsed = txt_parser.parse_sales_file(temp_file_path)
        
        if df_parsed is not None and not df_parsed.empty:
            records = df_parsed.to_dict('records')
            model_instances = [SalesTransaction(**rec) for rec in records]
            
            with transaction.atomic():
                SalesTransaction.objects.bulk_create(model_instances, ignore_conflicts=True, batch_size=500)
            
            return JsonResponse({
                'message': f'Successfully parsed and saved {len(records)} new records.'
            })
        else:
            return JsonResponse({'message': 'No valid data was parsed from the file.'})
            
    except Exception as e:
        return JsonResponse({'error': f'An unexpected error occurred: {str(e)}'}, status=500)
    finally:
        if default_storage.exists(temp_file_name):
            default_storage.delete(temp_file_name)


@csrf_exempt
@require_http_methods(["GET"]) # Changed to accept GET requests from frontend
def clear_data_view(request):
    """ Deletes all records from the SalesTransaction table. """
    try:
        count, _ = SalesTransaction.objects.all().delete()
        return JsonResponse({'message': f"Successfully deleted {count} records."})
    except Exception as e:
        return JsonResponse({'error': f"An error occurred: {e}"}, status=500)


# --- Analytics Helper Functions ---

# NEW: Helper for Dashboard.jsx KPIs

# NEW: A helper to format currency for the chart titles
def format_currency(value):
    if value >= 1_000_000:
        return f"₹{(value / 1_000_000):.1f}M"
    if value >= 1_000:
        return f"₹{(value / 1_000):.1f}K"
    return f"₹{value:.0f}"

def _get_kpi_metrics(df):
    if df.empty:
        return {
            'totalSales': 0, 'totalProducts': 0, 'totalStockists': 0, 'totalOrders': 0,
            'salesChangePercentage': 0
        }

    # Calculate main totals
    kpis = {
        'totalSales': df['value'].sum(),
        'totalProducts': df['item_name'].nunique(),
        'totalStockists': df['customer_name'].nunique(),
        'totalOrders': df['bill_no'].nunique(),
        'salesChangePercentage': 0  # Default value if no comparison is possible
    }

    # Calculate Week-over-Week change for the 'Total Sales' metric card
    df_copy = df.copy()
    df_copy['week'] = df_copy['date'].dt.to_period('W')
    weekly_sales = df_copy.groupby('week')['value'].sum().sort_index()

    # We need at least two weeks of data to calculate a change
    if len(weekly_sales) >= 2:
        last_week_sales = weekly_sales.iloc[-1]
        prev_week_sales = weekly_sales.iloc[-2]
        
        if prev_week_sales > 0:
            change = ((last_week_sales - prev_week_sales) / prev_week_sales) * 100
            kpis['salesChangePercentage'] = round(change, 1)
        elif last_week_sales > 0:
            # If previous week was 0, any sales is a 100% increase for simplicity
            kpis['salesChangePercentage'] = 100.0

    return kpis

# MODIFIED: Helper for Dashboard.jsx SalesReportCard to be more robust
def _get_sales_report_summary(df):
    if df.empty:
        # Return an empty dict, the frontend will handle it
        return {}

    output_data = {}
    latest_date = df['date'].max()

    # --- 1. Weekly Data (Last 4 weeks) ---
    df_copy = df.copy()
    df_copy['week'] = df_copy['date'].dt.to_period('W')
    weekly_sales = df_copy.groupby('week')['value'].sum().sort_index().tail(4) # Get last 4 weeks
    
    if not weekly_sales.empty:
        output_data['Weekly'] = {
            'title': format_currency(weekly_sales.sum()),
            'labels': weekly_sales.index.map(lambda p: p.start_time.strftime('%b %d')).tolist(),
            'data': [round(v, 2) for v in weekly_sales.values],
            'color': '#3b82f6',  # Blue
        }

    # --- 2. Monthly Data (Days of the latest month) ---
    monthly_df = df[(df['date'].dt.year == latest_date.year) & (df['date'].dt.month == latest_date.month)]
    if not monthly_df.empty:
        daily_sales = monthly_df.groupby(df['date'].dt.day)['value'].sum().sort_index()
        output_data['Monthly'] = {
            'title': format_currency(daily_sales.sum()),
            'labels': daily_sales.index.tolist(),
            'data': [round(v, 2) for v in daily_sales.values],
            'color': '#10b981',  # Green
        }
        
    # --- 3. Yearly Data (Months of the latest year) ---
    yearly_df = df[df['date'].dt.year == latest_date.year]
    if not yearly_df.empty:
        monthly_sales_of_year = yearly_df.groupby(df['date'].dt.to_period('M'))['value'].sum().sort_index()
        output_data['Yearly'] = {
            'title': format_currency(monthly_sales_of_year.sum()),
            'labels': monthly_sales_of_year.index.map(lambda p: p.strftime('%b')).tolist(),
            'data': [round(v, 2) for v in monthly_sales_of_year.values],
            'color': '#8b5cf6', # Purple
        }

    return output_data

# NEW: Helper for Dashboard.jsx TopStockistCard
def _get_revenue_by_area(df):
    if df.empty or 'area' not in df.columns:
        return []
    revenue = df.groupby('area')['value'].sum().sort_values(ascending=False).round(2)
    return [{'name': area, 'revenue': value} for area, value in revenue.items()]



def _get_sales_trends_by_area(df):
    if df.empty or 'area' not in df.columns: return {}
    df_copy = df.copy()
    df_copy['week'] = df_copy['date'].dt.to_period('W').astype(str)
    trends = df_copy.groupby(['area', 'week'])['value'].sum().unstack(fill_value=0)
    # Ensure all areas have the same weekly labels for consistent chart rendering
    all_weeks = trends.columns.tolist()
    return { 
        area: {'labels': all_weeks, 'data': [round(v, 2) for v in row.values]} 
        for area, row in trends.iterrows() 
    }

def _get_top_medicines_by_area(df, top_n=10):
    if df.empty: return {}
    chart_data = {}
    # Get top items per area
    top_items = df.groupby(['area', 'item_name'])['value'].sum().groupby('area', group_keys=False).nlargest(top_n)
    for (area, item), value in top_items.items():
        if area not in chart_data: 
            chart_data[area] = {'labels': [], 'data': []}
        chart_data[area]['labels'].append(item)
        chart_data[area]['data'].append(round(value, 2))
    return chart_data

def _get_growing_medicines(df):
    if df.empty or df['date'].dt.to_period('W').nunique() < 2:
        return {'labels': [], 'prev_month_sales': [], 'last_month_sales': []}
    sales = df.groupby(['item_name', df['date'].dt.to_period('W')])['value'].sum().unstack(fill_value=0).sort_index(axis=1)
    if sales.shape[1] < 2:
        return {'labels': [], 'prev_month_sales': [], 'last_month_sales': []}
    last_week_col, prev_week_col = sales.columns[-1], sales.columns[-2]
    growing = sales[sales[last_week_col] > sales[prev_week_col]].copy()
    growing.sort_values(by=last_week_col, ascending=False, inplace=True)
    growing = growing.head(10)
    return {
        'labels': growing.index.tolist(),
        'prev_month_sales': [round(v, 2) for v in growing[prev_week_col]],
        'last_month_sales': [round(v, 2) for v in growing[last_week_col]]
    }

def _get_prescriber_analysis(df, top_n=15):
    if df.empty or 'customer_name' not in df.columns: 
        return {'labels': [], 'data': []}
    prescribers = df.groupby('customer_name')['value'].sum().nlargest(top_n)
    return {'labels': prescribers.index.tolist(), 'data': [round(v, 2) for v in prescribers.values]}

def _get_high_free_quantity_products(df, top_n=15):
    if df.empty or 'free_quantity' not in df.columns or df['free_quantity'].sum() == 0:
        return {'labels': [], 'data': []}
    free_items = df.groupby('item_name')['free_quantity'].sum().nlargest(top_n)
    free_items = free_items[free_items > 0]
    return {'labels': free_items.index.tolist(), 'data': [int(v) for v in free_items.values]}

def _get_weekly_growth_trends(df):
    if df.empty or df['date'].dt.to_period('W').nunique() < 2:
        return None
    df_copy = df.copy()
    df_copy['week'] = df_copy['date'].dt.to_period('W')
    weekly_sales = df_copy.groupby('week')['value'].sum().sort_index()
    if len(weekly_sales) < 2:
        return None
    growth_rates = weekly_sales.pct_change().fillna(0) * 100
    return {
        'labels': [f"Week {i+1} vs Week {i}" for i in range(1, len(weekly_sales.index))],
        'data': [round(v, 2) for v in growth_rates.values[1:]]
    }

def _get_area_performance_comparison(df):
    if df.empty or 'area' not in df.columns:
        return None
    area_stats = df.groupby('area').agg({
        'value': 'sum',
        'bill_no': 'nunique'
    }).round(2).reset_index()
    return {
        'labels': area_stats['area'].tolist(),
        'totalSales': area_stats['value'].tolist(),
        'orderCount': area_stats['bill_no'].tolist()
    }


# --- The Main API View for the Analytics Dashboard ---

@require_http_methods(["GET"])
def sales_data_api(request):
    """
    Fetches all data and computes all necessary analytics for the frontend.
    """
    all_transactions = SalesTransaction.objects.all().values()
    df = pd.DataFrame.from_records(all_transactions)
    
    if df.empty:
        return JsonResponse({
            # ... (all other keys)
            'kpiMetrics': {'totalSales': 0, 'totalProducts': 0, 'totalStockists': 0, 'totalOrders': 0, 'salesChangePercentage': 0},
            'revenueByArea': [],
            'salesReport': {}, # MODIFIED: Send an empty object
        })
        
    # --- Data Cleaning and Preparation ---
    df['date'] = pd.to_datetime(df['date'])
    df['value'] = pd.to_numeric(df['value'], errors='coerce').fillna(0)
    df['free_quantity'] = pd.to_numeric(df['free_quantity'], errors='coerce').fillna(0)

    # --- Call all helper functions and combine results ---
    response_data = {
        # ... (all other keys for both dashboards)
        'totalRecords': len(df),
        'salesTrendsByArea': _get_sales_trends_by_area(df),
        'topMedicinesByArea': _get_top_medicines_by_area(df),
        'growingMedicines': _get_growing_medicines(df),
        'prescriberAnalysis': _get_prescriber_analysis(df),
        'highFreeQuantity': _get_high_free_quantity_products(df),
        'weeklyGrowthTrends': _get_weekly_growth_trends(df),
        'areaPerformance': _get_area_performance_comparison(df),
        'kpiMetrics': _get_kpi_metrics(df),
        'revenueByArea': _get_revenue_by_area(df),
        'salesReport': _get_sales_report_summary(df), # This now calls the rewritten function
    }
    print(response_data)
    return JsonResponse(response_data)

@require_http_methods(["POST"])
@csrf_exempt
def generate_pdf_report(request):

    try:
        data = json.loads(request.body)

        # Prepare rows for rendering
        area_perf = data.get('areaPerformance', {})
        area_rows = [
            {"label": area_perf["labels"][i], "totalSales": area_perf["totalSales"][i], "orderCount": area_perf["orderCount"][i]}
            for i in range(len(area_perf.get("labels", [])))
        ]

        top_meds = data.get('topMedicinesByArea', {}).get('Thrissur', {})
        top_meds_rows = [
            {"name": top_meds["labels"][i], "revenue": top_meds["data"][i]}
            for i in range(len(top_meds.get("labels", [])))
        ]

        growing = data.get('growingMedicines', {})
        growing_rows = [
            {
                "label": growing["labels"][i],
                "prev": growing["prev_month_sales"][i],
                "last": growing["last_month_sales"][i],
                "growth": growing["last_month_sales"][i] - growing["prev_month_sales"][i],
            }
            for i in range(len(growing.get("labels", [])))
        ]

        prescribers = data.get('prescriberAnalysis', {})
        prescriber_rows = [
            {"name": prescribers["labels"][i], "revenue": prescribers["data"][i]}
            for i in range(len(prescribers.get("labels", [])))
        ]

        free_q = data.get('highFreeQuantity', {})
        free_qty_rows = [
            {"product": free_q["labels"][i], "qty": free_q["data"][i]}
            for i in range(len(free_q.get("labels", [])))
        ]

        weekly = data.get('weeklyGrowthTrends', {})
        weekly_growth_rows = [
            {"week": weekly["labels"][i], "percent": weekly["data"][i]}
            for i in range(len(weekly.get("labels", [])))
        ]

        #  Manually hardcoded logo path
        
        logo_path = os.path.join(settings.BASE_DIR, 'shirr_data', 'static', 'report', 'img', 'logo.png')
        logo_path_url = f"file:///{logo_path.replace(os.sep, '/')}"

        context = {
            'logo_path': logo_path_url,
            'kpiMetrics': data.get('kpiMetrics'),
            'areaPerformanceRows': area_rows,
            'topMedicinesRows': top_meds_rows,
            'growingRows': growing_rows,
            'prescriberRows': prescriber_rows,
            'freeQtyRows': free_qty_rows,
            'weeklyGrowthRows': weekly_growth_rows,
            'reporting_month': datetime.datetime.now().strftime('%B %Y'),
            'reporting_period': 'Latest Sales Period',
            'generated_on': datetime.datetime.now().strftime('%B %d, %Y %I:%M %p'),
        }

        html_string = render_to_string("report/report_template.html", context)
        pdf_file = HTML(string=html_string).write_pdf()

        return HttpResponse(pdf_file, content_type='application/pdf', headers={
            'Content-Disposition': 'attachment; filename="sales_report.pdf"'
        })

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)



# Make sure _get_kpi_metrics is also present in your file from the previous step.

# part1 working on dashboard
# import os
# import pandas as pd
# from django.db import transaction
# from django.http import JsonResponse
# from django.core.files.storage import default_storage
# from django.views.decorators.http import require_POST
# from django.views.decorators.csrf import csrf_exempt

# from . import txt_parser
# from .models import SalesTransaction

# @csrf_exempt
# @require_POST
# def api_file_upload_view(request):
#     """
#     Handles file upload, calls the standardized parser, and saves to the database.
#     """
#     uploaded_file = request.FILES.get('file')
#     if not uploaded_file:
#         return JsonResponse({'error': 'No file uploaded'}, status=400)

#     # Save file temporarily to parse it
#     temp_file_name = default_storage.save(uploaded_file.name, uploaded_file)
#     temp_file_path = default_storage.path(temp_file_name)
    
#     try:
#         # Call the single, reliable parsing function
#         df_parsed = txt_parser.parse_sales_file(temp_file_path)
        
#         if df_parsed is not None and not df_parsed.empty:
#             # Convert DataFrame to a list of dictionaries for model creation
#             records_to_create = df_parsed.to_dict('records')
            
#             # Create model instances from the dictionaries
#             model_instances = [SalesTransaction(**record) for record in records_to_create]
            
#             # Use a transaction and bulk_create for efficient, safe insertion
#             with transaction.atomic():
#                 SalesTransaction.objects.bulk_create(model_instances, ignore_conflicts=True, batch_size=500)
            
#             response = {
#                 'message': f'Successfully parsed and saved {len(model_instances)} new records.',
#                 'total_records_in_db': SalesTransaction.objects.count(),
#             }
#         else:
#             response = {'message': 'No valid data was parsed from the file.'}
            
#     except Exception as e:
#         print(f"ERROR in api_file_upload_view: {e}")
#         return JsonResponse({'error': f'An unexpected error occurred: {str(e)}'}, status=500)
#     finally:
#         # Clean up the temporary file
#         if default_storage.exists(temp_file_name):
#             default_storage.delete(temp_file_name)

#     return JsonResponse(response)


# @csrf_exempt
# @require_POST
# def clear_database_data_view(request):
#     """ Deletes all records from the SalesTransaction table. """
#     try:
#         count, _ = SalesTransaction.objects.all().delete()
#         return JsonResponse({'message': f"Successfully deleted {count} records."})
#     except Exception as e:
#         return JsonResponse({'error': f"An error occurred: {e}"}, status=500)

# # ==============================================================================
# # All DASHBOARD HELPER FUNCTIONS AND THE sales_data_api VIEW REMAIN THE SAME
# # They are already correct and will work once the data is in the database.
# # =================================================_get_kpi_metrics(df)
# def _get_kpi_metrics(df):
#     if df.empty: return {'totalSales': 0, 'totalOrders': 0, 'totalProducts': 0, 'totalStockists': 0}
#     df['value'] = pd.to_numeric(df['value'], errors='coerce').fillna(0)
#     return {
#         'totalSales': round(df['value'].sum(), 2),
#         'totalOrders': df['bill_no'].nunique(),
#         'totalProducts': df['item_name'].nunique(),
#         'totalStockists': df['customer_name'].nunique(),
#     }

# def _get_sales_report(df):
#     if df.empty: return {}
#     df_copy = df.copy()
#     df_copy['date'] = pd.to_datetime(df_copy['date'])
#     df_copy.set_index('date', inplace=True)
#     yearly_sales = df_copy['value'].resample('ME').sum()
#     yearly_labels = yearly_sales.index.strftime('%b').tolist()
#     yearly_data = [round(v / 1000000, 2) for v in yearly_sales.values]
#     latest_month = df_copy.index.max().to_period('M').to_timestamp()
#     monthly_df = df_copy[df_copy.index >= latest_month]
#     monthly_sales = monthly_df['value'].resample('D').sum()
#     monthly_labels = monthly_sales.index.day.tolist()
#     monthly_data = [round(v / 1000, 1) for v in monthly_sales.values]
#     end_date, start_date = df_copy.index.max(), df_copy.index.max() - pd.Timedelta(days=6)
#     weekly_df = df_copy.loc[start_date:end_date]
#     weekly_sales = weekly_df['value'].resample('D').sum().reindex(pd.date_range(start_date, end_date, freq='D'), fill_value=0)
#     weekly_labels = [d.strftime('%a') for d in weekly_sales.index]
#     weekly_data = [round(v / 1000, 1) for v in weekly_sales.values]
#     return {
#         'Yearly': {'title': f"Yearly Sales: ₹{sum(yearly_data):.1f}M", 'labels': yearly_labels, 'data': yearly_data, 'color': "#3B82F6"},
#         'Monthly': {'title': f"This Month: ₹{sum(monthly_data):.1f}K", 'labels': monthly_labels, 'data': monthly_data, 'color': "#10B981"},
#         'Weekly': {'title': f"Last 7 Days: ₹{sum(weekly_data):.1f}K", 'labels': weekly_labels, 'data': weekly_data, 'color': "#F59E0B"},
#     }

# def _get_growing_medicines(df):
#     if df.empty or df['date'].dt.to_period('M').nunique() < 2:
#         return {'message': "Requires data from at least two months."}
#     df['month'] = df['date'].dt.to_period('M')
#     sales = df.groupby(['item_name', 'month'])['value'].sum().unstack(fill_value=0).sort_index(axis=1)
#     if sales.shape[1] < 2: return {'message': "Not enough monthly data to compare."}
#     last_month, prev_month = sales.columns[-1], sales.columns[-2]
#     growing = sales[sales[last_month] > sales[prev_month]].copy()
#     growing.sort_values(by=last_month, ascending=False, inplace=True)
#     return {'labels': growing.index.tolist(), 'last_month_sales': [round(v, 2) for v in growing[last_month]]}

# def _get_revenue_by_area(df, top_n=5):
#     if df.empty or 'area' not in df.columns: return []
#     revenue = df.groupby('area')['value'].sum().nlargest(top_n)
#     return [{'name': area, 'revenue': round(value)} for area, value in revenue.items()]

# def sales_data_api(request):
#     all_transactions = SalesTransaction.objects.all().values()
#     df = pd.DataFrame.from_records(all_transactions)
#     if df.empty:
#         return JsonResponse({
#             'kpiMetrics': {'totalSales': 0, 'totalOrders': 0, 'totalProducts': 0, 'totalStockists': 0},
#             'salesReport': {}, 'growingMedicines': {'message': 'No data available.'},
#             'revenueByArea': [], 'totalRecords': 0
#         })
#     df['date'] = pd.to_datetime(df['date'])
#     df['value'] = pd.to_numeric(df['value'], errors='coerce').fillna(0)
#     return JsonResponse({
#         'kpiMetrics': _get_kpi_metrics(df),
#         'salesReport': _get_sales_report(df),
#         'growingMedicines': _get_growing_medicines(df),
#         'revenueByArea': _get_revenue_by_area(df),
#         'totalRecords': len(df),
#     })



# import os
# import pandas as pd
# from django.db import transaction
# from django.http import JsonResponse
# from django.core.files.storage import default_storage
# from django.views.decorators.http import require_POST
# from django.views.decorators.csrf import csrf_exempt

# from . import txt_parser
# from .models import SalesTransaction

# # --- File Handling Views (Unchanged and Correct) ---

# @csrf_exempt
# @require_POST
# def api_file_upload_view(request):
#     uploaded_file = request.FILES.get('file')
#     if not uploaded_file:
#         return JsonResponse({'error': 'No file uploaded'}, status=400)
#     temp_file_name = default_storage.save(uploaded_file.name, uploaded_file)
#     temp_file_path = default_storage.path(temp_file_name)
#     try:
#         df_parsed = txt_parser.parse_sales_file(temp_file_path)
#         if df_parsed is not None and not df_parsed.empty:
#             records = df_parsed.to_dict('records')
#             model_instances = [SalesTransaction(**rec) for rec in records]
#             with transaction.atomic():
#                 SalesTransaction.objects.bulk_create(model_instances, ignore_conflicts=True, batch_size=500)
#             return JsonResponse({'message': f'Successfully parsed and saved {len(records)} new records.'})
#         else:
#             return JsonResponse({'message': 'No valid data was parsed from the file.'})
#     except Exception as e:
#         return JsonResponse({'error': f'An unexpected error occurred: {str(e)}'}, status=500)
#     finally:
#         if default_storage.exists(temp_file_name):
#             default_storage.delete(temp_file_name)

# @csrf_exempt
# @require_POST
# def clear_database_data_view(request):
#     try:
#         count, _ = SalesTransaction.objects.all().delete()
#         return JsonResponse({'message': f"Successfully deleted {count} records."})
#     except Exception as e:
#         return JsonResponse({'error': f"An error occurred: {e}"}, status=500)

# # --- All Helper Functions for BOTH Dashboard and Analytics ---

# # For Dashboard KPIs
# def _get_kpi_metrics(df):
#     if df.empty: return {'totalSales': 0, 'totalOrders': 0, 'totalProducts': 0, 'totalStockists': 0}
#     return {
#         'totalSales': round(df['value'].sum(), 2),
#         'totalOrders': df['bill_no'].nunique(),
#         'totalProducts': df['item_name'].nunique(),
#         'totalStockists': df['customer_name'].nunique(),
#     }

# # For Dashboard Sales Report Card
# def _get_sales_report(df):
#     if df.empty: return {}
#     df_copy = df.copy(); df_copy.set_index('date', inplace=True)
#     yearly = df_copy['value'].resample('ME').sum()
#     monthly = df_copy.loc[df_copy.index.max().to_period('M').to_timestamp():]['value'].resample('D').sum()
#     weekly_range = pd.date_range(end=df_copy.index.max(), periods=7, freq='D')
#     weekly = df_copy.loc[weekly_range[0]:weekly_range[-1]]['value'].resample('D').sum().reindex(weekly_range, fill_value=0)
#     return {
#         'Yearly': {'title': f"Yearly: ₹{yearly.sum()/1e6:.1f}M", 'labels': yearly.index.strftime('%b'), 'data': (yearly.values/1e6).round(2)},
#         'Monthly': {'title': f"This Month: ₹{monthly.sum()/1e3:.1f}K", 'labels': monthly.index.day, 'data': (monthly.values/1e3).round(1)},
#         'Weekly': {'title': f"Last 7 Days: ₹{weekly.sum()/1e3:.1f}K", 'labels': weekly.index.strftime('%a'), 'data': (weekly.values/1e3).round(1)},
#     }

# # For Dashboard Top Stockist Card
# def _get_revenue_by_area(df, top_n=5):
#     if df.empty or 'area' not in df.columns: return []
#     return [{'name': area, 'revenue': round(value)} for area, value in df.groupby('area')['value'].sum().nlargest(top_n).items()]

# # For Analytics Sales Trends
# def _get_sales_trends_by_area(df):
#     if df.empty: return {}
#     df['week'] = df['date'].dt.to_period('W').astype(str)
#     trends = df.groupby(['area', 'week'])['value'].sum().unstack(fill_value=0)
#     return { area: {'labels': row.index.tolist(), 'data': [round(v, 2) for v in row.values]} for area, row in trends.iterrows() }

# # For Analytics Top Medicines
# def _get_top_medicines_by_area(df, top_n=5):
#     if df.empty: return {}
#     chart_data = {}
#     top_items = df.groupby(['area', 'item_name'])['value'].sum().groupby('area', group_keys=False).nlargest(top_n)
#     for (area, item), value in top_items.items():
#         if area not in chart_data: chart_data[area] = {'labels': [], 'data': []}
#         chart_data[area]['labels'].append(item); chart_data[area]['data'].append(round(value, 2))
#     return chart_data

# # For BOTH Dashboard and Analytics (provides all needed keys)
# def _get_growing_medicines(df):
#     if df.empty or df['date'].dt.to_period('M').nunique() < 2: return {}
#     sales = df.groupby(['item_name', df['date'].dt.to_period('M')])['value'].sum().unstack(fill_value=0).sort_index(axis=1)
#     if sales.shape[1] < 2: return {}
#     last_month, prev_month = sales.columns[-1], sales.columns[-2]
#     growing = sales[sales[last_month] > sales[prev_month]].copy()
#     growing.sort_values(by=last_month, ascending=False, inplace=True)
#     return {
#         'labels': growing.index.tolist(),
#         'last_month_sales': [round(v, 2) for v in growing[last_month]],
#         'prev_month_sales': [round(v, 2) for v in growing[prev_month]]
#     }

# # For Analytics Prescribers
# def _get_prescriber_analysis(df, top_n=15):
#     if df.empty: return {}
#     prescribers = df.groupby('customer_name')['value'].sum().nlargest(top_n)
#     return {'labels': prescribers.index.tolist(), 'data': [round(v, 2) for v in prescribers.values]}

# # For Analytics Free Quantity
# def _get_high_free_quantity_products(df, top_n=15):
#     if df.empty or df['free_quantity'].sum() == 0: return {}
#     free_items = df.groupby('item_name')['free_quantity'].sum().nlargest(top_n)
#     return {'labels': free_items.index.tolist(), 'data': [int(v) for v in free_items.values]}

# # --- The Single, Unified API View ---
# def sales_data_api(request):
#     all_transactions = SalesTransaction.objects.all().values()
#     df = pd.DataFrame.from_records(all_transactions)
#     if df.empty:
#         return JsonResponse({'message': 'No data available.'}, status=404)
        
#     df['date'] = pd.to_datetime(df['date'])
#     df['value'] = pd.to_numeric(df['value'], errors='coerce').fillna(0)
#     df['free_quantity'] = pd.to_numeric(df['free_quantity'], errors='coerce').fillna(0)

#     # Call all helper functions and combine results
#     response_data = {
#         'totalRecords': len(df),
#         'kpiMetrics': _get_kpi_metrics(df),
#         'salesReport': _get_sales_report(df),
#         'revenueByArea': _get_revenue_by_area(df),
#         'salesTrendsByArea': _get_sales_trends_by_area(df),
#         'topMedicinesByArea': _get_top_medicines_by_area(df),
#         'growingMedicines': _get_growing_medicines(df),
#         'prescriberAnalysis': _get_prescriber_analysis(df),
#         'highFreeQuantity': _get_high_free_quantity_products(df),
#     }
#     return JsonResponse(response_data)