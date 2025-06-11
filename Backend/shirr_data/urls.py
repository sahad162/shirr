from django.urls import path
from . import views

urlpatterns = [
    # File upload endpoint
    path('api/upload/', views.upload_file_api, name='upload_file_api'),
    
    # Chart data endpoint
    path('api/chart-data/', views.chart_data_api, name='chart_data_api'),
    
    # Export report endpoint
    path('api/export/', views.export_report_api, name='export_report_api'),
 
]