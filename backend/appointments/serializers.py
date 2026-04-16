from rest_framework import serializers
from .models import Appointment, Visit
from users.serializers import UserSerializer
from doctors.serializers import DoctorProfileSerializer

class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)
    doctor_specialty = serializers.CharField(source='doctor.specialty.name', read_only=True)
    
    class Meta:
        model = Appointment
        fields = '__all__'
        read_only_fields = ('created_at',)

class AppointmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ('doctor', 'datetime', 'reason')

    def validate(self, data):
        doctor = data['doctor']
        appointment_datetime = data['datetime']
        
        from django.utils import timezone
        if appointment_datetime < timezone.now():
            raise serializers.ValidationError({"datetime": "Нельзя записаться на прошедшее время"})
        
        if Appointment.objects.filter(doctor=doctor, datetime=appointment_datetime, status='active').exists():
            raise serializers.ValidationError({"datetime": "Это время уже занято"})
        
        return data

class VisitSerializer(serializers.ModelSerializer):
    appointment_id = serializers.IntegerField(source='appointment.id', read_only=True)
    patient_name = serializers.CharField(source='appointment.patient.get_full_name', read_only=True)
    doctor_name = serializers.CharField(source='appointment.doctor.user.get_full_name', read_only=True)
    
    class Meta:
        model = Visit
        fields = ('id', 'appointment', 'appointment_id', 'patient_name', 'doctor_name', 
                  'actual_datetime', 'status', 'absence_reason')