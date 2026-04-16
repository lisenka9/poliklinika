from django.contrib import admin
from .models import Appointment, Visit

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('patient', 'doctor', 'datetime', 'status', 'created_at')
    list_filter = ('status', 'datetime', 'doctor')
    search_fields = ('patient__last_name', 'patient__first_name', 'doctor__user__last_name')
    date_hierarchy = 'datetime'

@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ('appointment', 'actual_datetime', 'status')
    list_filter = ('status',)