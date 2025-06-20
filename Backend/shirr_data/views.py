import pandas as pd
from django.db import transaction, IntegrityError
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.csrf import csrf_exempt
import os
from django.conf import settings
import json
import datetime
import traceback
from weasyprint import HTML
import hashlib

from . import txt_parser
from .models import SalesTransaction, DataFile

# Helper function remains the same
def calculate_sha256(file_obj):
    """Calculates the SHA-256 hash of a file-like object in chunks."""
    sha256_hash = hashlib.sha256()
    file_obj.seek(0)
    for chunk in file_obj.chunks():
        sha256_hash.update(chunk)
    file_obj.seek(0)
    return sha256_hash.hexdigest()


# ==============================================================================
# UNIFIED FILE UPLOAD VIEW (CORRECTED LOGIC)
# ==============================================================================

@csrf_exempt
@require_POST
def api_unified_upload_view(request):
    """
    Handles all file uploads, preventing duplicate file storage by checking
    the file hash *before* saving the file to disk.
    """
    uploaded_files = request.FILES.getlist('file')
    if not uploaded_files:
        return JsonResponse({'error': 'No files were uploaded.'}, status=400)

    parsed_record_count = 0
    parsed_file_count = 0
    stored_only_files = []
    skipped_as_duplicate = []

    for f in uploaded_files:
        try:
            # Step 1: Calculate the file's hash in memory.
            current_file_hash = calculate_sha256(f)

            # --- THIS IS THE KEY LOGIC CHANGE ---
            # Step 2: Check if this hash already exists in the database.
            if DataFile.objects.filter(file_hash=current_file_hash).exists():
                # If it exists, skip this file entirely. Do not save it.
                skipped_as_duplicate.append(f.name)
                continue  # Move to the next file in the loop

            # --- If we get here, the file is new. ---
            
            # Step 3: Now it's safe to create the model, which saves the file.
            data_file_instance = DataFile.objects.create(
                file=f,
                file_hash=current_file_hash
            )
            file_path = data_file_instance.file.path
            
            # Step 4: Attempt to parse the new file.
            df_parsed = txt_parser.parse_sales_file(file_path)
            
            # Step 5: If parsing is successful, save the transaction data.
            if df_parsed is not None and not df_parsed.empty:
                records = df_parsed.to_dict('records')
                model_instances = [SalesTransaction(**rec) for rec in records]
                
                with transaction.atomic():
                    SalesTransaction.objects.bulk_create(model_instances, ignore_conflicts=True, batch_size=500)
                
                parsed_record_count += len(records)
                parsed_file_count += 1
            else:
                stored_only_files.append(f.name)

        except Exception as e:
            # This is a general catch-all for other unexpected errors during processing.
            print(f"Error processing file {f.name}: {str(e)}")
            traceback.print_exc()
            stored_only_files.append(f.name)

    # Step 6: Create a comprehensive success message.
    message_parts = []
    if parsed_record_count > 0:
        message_parts.append(f"Successfully processed {parsed_record_count} records from {parsed_file_count} new file(s).")
    
    if skipped_as_duplicate:
        message_parts.append(f"{len(skipped_as_duplicate)} file(s) were skipped as duplicates: {', '.join(skipped_as_duplicate)}.")
        
    if stored_only_files:
        message_parts.append(f"{len(stored_only_files)} file(s) were stored but not parsed: {', '.join(stored_only_files)}.")

    if not message_parts:
        message = "Files were uploaded, but no new data was processed (they may have all been duplicates)."
    else:
        message = " ".join(message_parts)
        
    return JsonResponse({'message': message})


# ==============================================================================
# DATA MANAGEMENT & ANALYTICS VIEWS (Unchanged)
# ==============================================================================

@csrf_exempt
@require_http_methods(["GET"])
def clear_data_view(request):
    """ Deletes all records from the SalesTransaction table. """
    try:
        count, _ = SalesTransaction.objects.all().delete()
        DataFile.objects.all().delete() # Also clear the file records
        # You might also want to clear the physical files from the 'uploads' directory here
        return JsonResponse({'message': f"Successfully deleted {count} records and all tracked files."})
    except Exception as e:
        return JsonResponse({'error': f"An error occurred: {e}"}, status=500)


# ==============================================================================
# DATA MANAGEMENT VIEWS
# ==============================================================================

@csrf_exempt
@require_http_methods(["GET"])
def clear_data_view(request):
    """ Deletes all records from the SalesTransaction table. """
    try:
        count, _ = SalesTransaction.objects.all().delete()
        return JsonResponse({'message': f"Successfully deleted {count} records."})
    except Exception as e:
        return JsonResponse({'error': f"An error occurred: {e}"}, status=500)

# ==============================================================================
# ANALYTICS HELPER FUNCTIONS
# ==============================================================================

def format_currency(value):
    """A helper to format currency for the chart titles"""
    if value >= 1_000_000:
        return f"₹{(value / 1_000_000):.1f}M"
    if value >= 1_000:
        return f"₹{(value / 1_000):.1f}K"
    return f"₹{value:.0f}"

def _get_kpi_metrics(df):
    """Calculates KPI metrics for the main dashboard."""
    if df.empty:
        return {'totalSales': 0, 'totalProducts': 0, 'totalStockists': 0, 'totalOrders': 0, 'salesChangePercentage': 0}

    kpis = {
        'totalSales': df['value'].sum(),
        'totalProducts': df['item_name'].nunique(),
        'totalStockists': df['customer_name'].nunique(),
        'totalOrders': df['bill_no'].nunique(),
        'salesChangePercentage': 0
    }

    df_copy = df.copy()
    df_copy['week'] = df_copy['date'].dt.to_period('W')
    weekly_sales = df_copy.groupby('week')['value'].sum().sort_index()

    if len(weekly_sales) >= 2:
        last_week_sales, prev_week_sales = weekly_sales.iloc[-1], weekly_sales.iloc[-2]
        if prev_week_sales > 0:
            kpis['salesChangePercentage'] = round(((last_week_sales - prev_week_sales) / prev_week_sales) * 100, 1)
        elif last_week_sales > 0:
            kpis['salesChangePercentage'] = 100.0
    return kpis

def _get_sales_report_summary(df):
    """Generates data for the main Sales Report card (Weekly/Monthly/Yearly)."""
    if df.empty:
        return {}
    output_data = {}
    latest_date = df['date'].max()

    # Weekly Data (Last 4 weeks)
    df_copy = df.copy()
    df_copy['week'] = df_copy['date'].dt.to_period('W')
    weekly_sales = df_copy.groupby('week')['value'].sum().sort_index().tail(4)
    if not weekly_sales.empty:
        output_data['Weekly'] = {
            'title': format_currency(weekly_sales.sum()),
            'labels': weekly_sales.index.map(lambda p: p.start_time.strftime('%b %d')).tolist(),
            'data': [round(v, 2) for v in weekly_sales.values],
            'color': '#3b82f6',
        }

    # Monthly Data (Days of the latest month)
    monthly_df = df[(df['date'].dt.year == latest_date.year) & (df['date'].dt.month == latest_date.month)]
    if not monthly_df.empty:
        daily_sales = monthly_df.groupby(df['date'].dt.day)['value'].sum().sort_index()
        output_data['Monthly'] = {
            'title': format_currency(daily_sales.sum()),
            'labels': daily_sales.index.tolist(),
            'data': [round(v, 2) for v in daily_sales.values],
            'color': '#10b981',
        }
        
    # Yearly Data (Months of the latest year)
    yearly_df = df[df['date'].dt.year == latest_date.year]
    if not yearly_df.empty:
        monthly_sales_of_year = yearly_df.groupby(df['date'].dt.to_period('M'))['value'].sum().sort_index()
        output_data['Yearly'] = {
            'title': format_currency(monthly_sales_of_year.sum()),
            'labels': monthly_sales_of_year.index.map(lambda p: p.strftime('%b')).tolist(),
            'data': [round(v, 2) for v in monthly_sales_of_year.values],
            'color': '#8b5cf6',
        }
    return output_data

def _get_revenue_by_area(df):
    """For the Top Stockist card."""
    if df.empty or 'area' not in df.columns:
        return []
    revenue = df.groupby('area')['value'].sum().sort_values(ascending=False).round(2)
    return [{'name': area, 'revenue': value} for area, value in revenue.items()]

def _get_sales_trends_by_area(df):
    """For Analytics page: line chart of sales over time by area."""
    if df.empty or 'area' not in df.columns: return {}
    df_copy = df.copy()
    df_copy['week'] = df_copy['date'].dt.to_period('W').astype(str)
    trends = df_copy.groupby(['area', 'week'])['value'].sum().unstack(fill_value=0)
    all_weeks = trends.columns.tolist()
    return { area: {'labels': all_weeks, 'data': [round(v, 2) for v in row.values]} for area, row in trends.iterrows() }

def _get_top_medicines_by_area(df, top_n=10):
    """For Analytics page: bar chart of top medicines in a selected area."""
    if df.empty: return {}
    chart_data = {}
    top_items = df.groupby(['area', 'item_name'])['value'].sum().groupby('area', group_keys=False).nlargest(top_n)
    for (area, item), value in top_items.items():
        if area not in chart_data: chart_data[area] = {'labels': [], 'data': []}
        chart_data[area]['labels'].append(item); chart_data[area]['data'].append(round(value, 2))
    return chart_data

def _get_growing_medicines(df):
    """For both dashboards: shows products with WoW growth."""
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
    """For Analytics page: shows top customers by sales value."""
    if df.empty or 'customer_name' not in df.columns: return {'labels': [], 'data': []}
    prescribers = df.groupby('customer_name')['value'].sum().nlargest(top_n)
    return {'labels': prescribers.index.tolist(), 'data': [round(v, 2) for v in prescribers.values]}

def _get_high_free_quantity_products(df, top_n=15):
    """For Analytics page: shows products with the most free units given away."""
    if df.empty or 'free_quantity' not in df.columns or df['free_quantity'].sum() == 0:
        return {'labels': [], 'data': []}
    free_items = df.groupby('item_name')['free_quantity'].sum().nlargest(top_n)
    free_items = free_items[free_items > 0]
    return {'labels': free_items.index.tolist(), 'data': [int(v) for v in free_items.values]}

def _get_weekly_growth_trends(df):
    """For PDF report: calculates WoW growth percentages."""
    if df.empty or df['date'].dt.to_period('W').nunique() < 2: return None
    df_copy = df.copy()
    df_copy['week'] = df_copy['date'].dt.to_period('W')
    weekly_sales = df_copy.groupby('week')['value'].sum().sort_index()
    if len(weekly_sales) < 2: return None
    growth_rates = weekly_sales.pct_change().fillna(0) * 100
    return {
        'labels': [f"Week {i+1} vs {i}" for i in range(1, len(weekly_sales.index))],
        'data': [round(v, 2) for v in growth_rates.values[1:]]
    }

def _get_area_performance_comparison(df):
    """For PDF report: compares total sales and order count by area."""
    if df.empty or 'area' not in df.columns: return None
    area_stats = df.groupby('area').agg(totalSales=('value', 'sum'), orderCount=('bill_no', 'nunique')).round(2).reset_index()
    return area_stats.to_dict('list')

# ==============================================================================
# MAIN API ENDPOINT FOR ALL DASHBOARDS
# ==============================================================================

@require_http_methods(["GET"])
def sales_data_api(request):
    """
    Fetches all data and computes all necessary analytics for the frontend.
    """
    all_transactions = SalesTransaction.objects.all().values()
    df = pd.DataFrame.from_records(all_transactions)
    
    if df.empty:
        return JsonResponse({
            'kpiMetrics': _get_kpi_metrics(df),
            'revenueByArea': [],
            'salesReport': {},
            'salesTrendsByArea': {},
            'topMedicinesByArea': {},
            'growingMedicines': {},
            'prescriberAnalysis': {},
            'highFreeQuantity': {},
            'weeklyGrowthTrends': None,
            'areaPerformance': None,
            'totalRecords': 0,
        })
        
    df['date'] = pd.to_datetime(df['date'])
    df['value'] = pd.to_numeric(df['value'], errors='coerce').fillna(0)
    df['free_quantity'] = pd.to_numeric(df['free_quantity'], errors='coerce').fillna(0)

    response_data = {
        'totalRecords': len(df),
        'kpiMetrics': _get_kpi_metrics(df),
        'salesReport': _get_sales_report_summary(df),
        'revenueByArea': _get_revenue_by_area(df),
        'salesTrendsByArea': _get_sales_trends_by_area(df),
        'topMedicinesByArea': _get_top_medicines_by_area(df),
        'growingMedicines': _get_growing_medicines(df),
        'prescriberAnalysis': _get_prescriber_analysis(df),
        'highFreeQuantity': _get_high_free_quantity_products(df),
        'weeklyGrowthTrends': _get_weekly_growth_trends(df),
        'areaPerformance': _get_area_performance_comparison(df),
    }
    return JsonResponse(response_data)


# ==============================================================================
# PDF REPORT GENERATION VIEW
# ==============================================================================

@require_http_methods(["POST"])
@csrf_exempt
def generate_pdf_report(request):
    try:
        data = json.loads(request.body)
        
        # This uses the robust PDF report logic we discussed earlier
        area_perf = data.get('areaPerformance', {})
        top_meds_area = "N/A"
        top_meds = {}

        if area_perf.get("labels") and area_perf.get("totalSales"):
            top_area_tuple = max(zip(area_perf["labels"], area_perf["totalSales"]), key=lambda item: item[1], default=(None, None))
            top_meds_area = top_area_tuple[0]
        if top_meds_area and top_meds_area != "N/A":
            top_meds = data.get('topMedicinesByArea', {}).get(top_meds_area, {})
        top_medicines_title = f"Top Medicines in {top_meds_area}" if top_meds_area != "N/A" else "Top Medicines by Revenue"

        context = {
            'logo_path': f"file:///{os.path.join(settings.BASE_DIR, 'shirr_data', 'static', 'report', 'img', 'logo.png').replace(os.sep, '/')}",
            'kpiMetrics': data.get('kpiMetrics'),
            'areaPerformanceRows': [dict(zip(area_perf.keys(), t)) for t in zip(*area_perf.values())] if area_perf else [],
            'topMedicinesRows': [dict(zip(top_meds.keys(), t)) for t in zip(*top_meds.values())] if top_meds else [],
            'growingRows': [dict(zip(data.get('growingMedicines', {}).keys(), t)) for t in zip(*data.get('growingMedicines', {}).values())],
            'prescriberRows': [dict(zip(data.get('prescriberAnalysis', {}).keys(), t)) for t in zip(*data.get('prescriberAnalysis', {}).values())],
            'freeQtyRows': [dict(zip(data.get('highFreeQuantity', {}).keys(), t)) for t in zip(*data.get('highFreeQuantity', {}).values())],
            'weeklyGrowthRows': [dict(zip(data.get('weeklyGrowthTrends', {}).keys(), t)) for t in zip(*data.get('weeklyGrowthTrends', {}).values())] if data.get('weeklyGrowthTrends') else [],
            'topMedicinesTitle': top_medicines_title,
            'reporting_month': datetime.datetime.now().strftime('%B %Y'),
            'generated_on': datetime.datetime.now().strftime('%B %d, %Y %I:%M %p'),
        }

        html_string = render_to_string("report/report_template.html", context)
        pdf_file = HTML(string=html_string, base_url=request.build_absolute_uri()).write_pdf()

        return HttpResponse(pdf_file, content_type='application/pdf', headers={
            'Content-Disposition': 'attachment; filename="sales_report.pdf"'
        })

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)