from django.db import models

# This model is for tracking the uploaded file itself (optional but good practice)
class DataFile(models.Model):
    file = models.FileField(upload_to='uploads/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file.name

# NEW MODEL: This will store the actual parsed transaction data in PostgreSQL
class SalesTransaction(models.Model):
    # Common fields from both parsers
    customer_name = models.CharField(max_length=255, db_index=True)
    item_name = models.CharField(max_length=255, db_index=True)
    date = models.DateField(db_index=True)
    bill_no = models.CharField(max_length=100)
    quantity = models.IntegerField(default=0)
    free_quantity = models.IntegerField(default=0)
    ptr = models.FloatField(default=0.0)
    value = models.FloatField(default=0.0)
    
    # Fields specific to TXT parser
    batch_no = models.CharField(max_length=100, null=True, blank=True)
    expiry = models.CharField(max_length=50, null=True, blank=True)
    area = models.CharField(max_length=100, null=True, blank=True) # Renamed from 'Region'

    # Fields specific to PDF parser
    distributor = models.CharField(max_length=255, null=True, blank=True)
    manufacturer = models.CharField(max_length=255, null=True, blank=True)
    pack_size = models.CharField(max_length=50, null=True, blank=True)
    mrp = models.FloatField(null=True, blank=True, default=0.0)
    product_discount_percent = models.FloatField(null=True, blank=True, default=0.0)
    discount_amount = models.FloatField(null=True, blank=True, default=0.0)
    customer_discount_percent = models.FloatField(null=True, blank=True, default=0.0)
    
    class Meta:
        ordering = ['-date', 'customer_name']
        indexes = [
            models.Index(fields=['date', 'area']),
        ]

    def __str__(self):
        return f"{self.item_name} - {self.customer_name} on {self.date}"