from django.contrib import admin
from .models import MedicalRecord

@admin.register(MedicalRecord)
class MedicalRecordAdmin(admin.ModelAdmin):
    list_display = ('patient', 'doctor', 'visit_date', 'diagnosis')
    list_filter = ('doctor', 'visit_date')
    search_fields = ('patient__last_name', 'patient__first_name', 'diagnosis')
    date_hierarchy = 'visit_date'