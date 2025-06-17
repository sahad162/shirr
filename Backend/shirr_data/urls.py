# shirr_data/urls.py

from django.urls import path
from . import views

# The 'api/' prefix is now included here to match frontend requests, resolving the 404 error.
# This assumes the app's urls are included at the project root level in your main urls.py.
urlpatterns = [
    path('api/upload/', views.api_file_upload_view, name='api_file_upload'),
    path('api/sales-data/', views.sales_data_api, name='api_sales_data'),
    path('api/clear-data/', views.clear_data_view, name='api_clear_data'),
]