# shirr_data/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # The 'api/' prefix is now REMOVED from here.
    path('upload/', views.api_file_upload_view, name='api_file_upload'),
    path('sales-data/', views.sales_data_api, name='api_sales_data'),
    path('clear-data/', views.clear_data_view, name='api_clear_data'),
]