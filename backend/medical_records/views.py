from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from appointments.models import Appointment, Visit
from .models import MedicalRecord
from .serializers import MedicalRecordSerializer, MedicalRecordCreateSerializer

class MedicalRecordViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = MedicalRecord.objects.all()

    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return MedicalRecord.objects.filter(patient=user)
        elif user.role == 'doctor':
            return MedicalRecord.objects.filter(doctor__user=user)
        elif user.role == 'admin':
            return MedicalRecord.objects.all()
        return MedicalRecord.objects.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return MedicalRecordCreateSerializer
        return MedicalRecordSerializer

    def perform_create(self, serializer):
        serializer.save(
            patient=serializer.validated_data['visit'].appointment.patient,
            doctor=serializer.validated_data['visit'].appointment.doctor
        )
    
    @action(detail=False, methods=['post'])
    def create_from_appointment(self, request):
        appointment_id = request.data.get('appointment_id')
        complaints = request.data.get('complaints')
        diagnosis = request.data.get('diagnosis')
        prescription = request.data.get('prescription', '')
        recommendations = request.data.get('recommendations', '')
        
        if not appointment_id or not complaints or not diagnosis:
            return Response(
                {'error': 'appointment_id, complaints, diagnosis обязательны'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            appointment = Appointment.objects.get(id=appointment_id)
        except Appointment.DoesNotExist:
            return Response({'error': 'Запись не найдена'}, status=status.HTTP_404_NOT_FOUND)
        
        appointment.status = 'completed'
        appointment.save()
        
        visit, created = Visit.objects.get_or_create(appointment=appointment)
        
        medical_record = MedicalRecord.objects.create(
            patient=appointment.patient,
            doctor=appointment.doctor,
            visit=visit,
            visit_date=timezone.now(),
            complaints=complaints,
            diagnosis=diagnosis,
            prescription=prescription,
            recommendations=recommendations
        )
        
        serializer = self.get_serializer(medical_record)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
