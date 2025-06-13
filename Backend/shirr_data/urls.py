from django.urls import path
from . import views

urlpatterns = [
    path('api/reports/upload/', views.api_file_upload_view, name='api_file_upload'),
    path('api/reports/', views.list_uploaded_reports, name='list_uploaded_reports'),
    path('api/report_data/', views.report_data_api, name='report_data_api'),
]