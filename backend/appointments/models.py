from django.db import models
from users.models import User
from doctors.models import DoctorProfile

class Appointment(models.Model):
    STATUS_CHOICES = (
        ('active', 'Активна'),
        ('cancelled', 'Отменена'),
        ('completed', 'Завершена'),
    )
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='appointments', limit_choices_to={'role': 'patient'})
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='appointments')
    datetime = models.DateTimeField(verbose_name='Дата и время приёма')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    reason = models.TextField(blank=True, null=True, verbose_name='Причина обращения')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.patient.get_full_name()} -> {self.doctor} ({self.datetime})"

    class Meta:
        verbose_name = 'Запись на приём'
        verbose_name_plural = 'Записи на приём'
        ordering = ['datetime']
        indexes = [
            models.Index(fields=['doctor', 'datetime']),
            models.Index(fields=['patient', 'status']),
        ]

class Visit(models.Model):
    VISIT_STATUS = (
        ('came', 'Явился'),
        ('not_came', 'Не явился'),
    )
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='visit')
    actual_datetime = models.DateTimeField(auto_now_add=True, verbose_name='Дата и время посещения')
    status = models.CharField(max_length=20, choices=VISIT_STATUS, default='came')
    absence_reason = models.TextField(blank=True, null=True, verbose_name='Причина неявки')

    def __str__(self):
        return f"Посещение: {self.appointment}"

    class Meta:
        verbose_name = 'Посещение'
        verbose_name_plural = 'Посещения'