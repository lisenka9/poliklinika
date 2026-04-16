from django.contrib import admin
from .models import Specialty, DoctorProfile, Schedule

@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'specialty', 'cabinet', 'experience', 'slot_duration')
    list_filter = ('specialty',)
    search_fields = ('user__last_name', 'user__first_name')

@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ('doctor', 'day_of_week', 'start_time', 'end_time')
    list_filter = ('doctor', 'day_of_week')