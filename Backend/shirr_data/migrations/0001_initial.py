# Generated by Django 5.2.3 on 2025-06-20 04:43

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='DataFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to='uploads/')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('file_hash', models.CharField(db_index=True, max_length=64, unique=True)),
            ],
        ),
        migrations.CreateModel(
            name='SalesTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('customer_name', models.CharField(db_index=True, max_length=255)),
                ('item_name', models.CharField(db_index=True, max_length=255)),
                ('date', models.DateField(db_index=True)),
                ('bill_no', models.CharField(max_length=100)),
                ('quantity', models.IntegerField(default=0)),
                ('free_quantity', models.IntegerField(default=0)),
                ('ptr', models.FloatField(default=0.0)),
                ('value', models.FloatField(default=0.0)),
                ('batch_no', models.CharField(blank=True, max_length=100, null=True)),
                ('expiry', models.CharField(blank=True, max_length=50, null=True)),
                ('area', models.CharField(blank=True, max_length=100, null=True)),
                ('distributor', models.CharField(blank=True, max_length=255, null=True)),
                ('manufacturer', models.CharField(blank=True, max_length=255, null=True)),
                ('pack_size', models.CharField(blank=True, max_length=50, null=True)),
                ('mrp', models.FloatField(blank=True, default=0.0, null=True)),
                ('product_discount_percent', models.FloatField(blank=True, default=0.0, null=True)),
                ('discount_amount', models.FloatField(blank=True, default=0.0, null=True)),
                ('customer_discount_percent', models.FloatField(blank=True, default=0.0, null=True)),
            ],
            options={
                'ordering': ['-date', 'customer_name'],
                'indexes': [models.Index(fields=['date', 'area'], name='shirr_data__date_882c28_idx')],
                'unique_together': {('bill_no', 'date', 'item_name')},
            },
        ),
    ]
