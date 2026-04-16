from rest_framework import serializers
from .models import Specialty, DoctorProfile, Schedule
from users.serializers import UserSerializer

class SpecialtySerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialty
        fields = '__all__'

class DoctorProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    specialty_name = serializers.CharField(source='specialty.name', read_only=True)

    class Meta:
        model = DoctorProfile
        fields = '__all__'

class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = '__all__'