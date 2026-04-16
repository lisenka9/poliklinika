from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('patient', 'Пациент'),
        ('doctor', 'Врач'),
        ('admin', 'Администратор'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='patient')
    middle_name = models.CharField(max_length=100, blank=True, null=True, verbose_name='Отчество')
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name='Телефон')
    email = models.EmailField(unique=True, verbose_name='Email')

    def __str__(self):
        return f"{self.last_name} {self.first_name} ({self.get_role_display()})"

    def save(self, *args, **kwargs):
        if not self.email:
            self.email = f"{self.username}@example.com"
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'