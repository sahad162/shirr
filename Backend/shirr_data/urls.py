# shirr_data/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # This now correctly sets your dashboard as the homepage
     path('upload/', views.api_file_upload_view, name='api_file_upload'),

    # The other URLs remain the same
    path('sales-data/', views.sales_data_api, name='sales_data_api'),
    path('clear-data/', views.clear_session_data_view, name='clear_data'),
]