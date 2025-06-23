from django.urls import path
from . import views

urlpatterns = [
    # This is for the main data upload and persistence
    path('api/upload/', views.api_unified_upload_view, name='api_unified_upload'),
    
    # This is for the main dashboard (fetches all data)
    path('api/sales-data/', views.sales_data_api, name='api_sales_data'),
    
    # This is our NEW endpoint for temporary, on-the-fly analysis
    path('api/analyze-session/', views.api_analyze_session_view, name='api_analyze_session'),

    path('api/clear-data/', views.clear_data_view, name='api_clear_data'),
    path('api/generate-report-pdf/', views.generate_pdf_report, name='api_generate_pdf_report'),
]