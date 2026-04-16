from django.db import models
from users.models import User
from doctors.models import DoctorProfile
from appointments.models import Visit

class MedicalRecord(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='medical_records', limit_choices_to={'role': 'patient'})
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='medical_records')
    visit = models.OneToOneField(Visit, on_delete=models.CASCADE, related_name='medical_record')
    visit_date = models.DateTimeField(verbose_name='Дата приёма')
    complaints = models.TextField(verbose_name='Жалобы')
    diagnosis = models.TextField(verbose_name='Диагноз')
    prescription = models.TextField(blank=True, null=True, verbose_name='Назначения')
    recommendations = models.TextField(blank=True, null=True, verbose_name='Рекомендации')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Медкарта: {self.patient.get_full_name()} - {self.visit_date}"

    class Meta:
        verbose_name = 'Запись в медкарте'
        verbose_name_plural = 'Медицинские карты'
        ordering = ['-visit_date']