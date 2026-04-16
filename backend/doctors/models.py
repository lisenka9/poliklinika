from django.db import models
from users.models import User

class Specialty(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name='Название')
    description = models.TextField(blank=True, null=True, verbose_name='Описание')

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'Специальность'
        verbose_name_plural = 'Специальности'

class DoctorProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='doctor_profile')
    specialty = models.ForeignKey(Specialty, on_delete=models.SET_NULL, null=True, verbose_name='Специальность')
    experience = models.IntegerField(default=0, verbose_name='Стаж (лет)')
    cabinet = models.IntegerField(verbose_name='Номер кабинета')
    slot_duration = models.IntegerField(default=20, verbose_name='Длительность приёма (мин)')

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.specialty}"

    class Meta:
        verbose_name = 'Профиль врача'
        verbose_name_plural = 'Профили врачей'

class Schedule(models.Model):
    DAYS_OF_WEEK = (
        (1, 'Понедельник'),
        (2, 'Вторник'),
        (3, 'Среда'),
        (4, 'Четверг'),
        (5, 'Пятница'),
        (6, 'Суббота'),
        (7, 'Воскресенье')
    )
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='schedules')
    day_of_week = models.IntegerField(choices=DAYS_OF_WEEK, verbose_name='День недели')
    start_time = models.TimeField(verbose_name='Начало приёма')
    end_time = models.TimeField(verbose_name='Конец приёма')
    slot_duration = models.IntegerField(default=20, verbose_name='Длительность приёма (мин)')

    def __str__(self):
        return f"{self.doctor} - {self.get_day_of_week_display()}"

    class Meta:
        verbose_name = 'Расписание'
        verbose_name_plural = 'Расписания'
        unique_together = ('doctor', 'day_of_week')