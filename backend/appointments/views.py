from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import datetime, timedelta
from django.db.models import Q
from doctors.models import DoctorProfile, Schedule
from .models import Appointment, Visit
from .serializers import AppointmentSerializer, AppointmentCreateSerializer, VisitSerializer

class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Appointment.objects.all()

    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return Appointment.objects.filter(patient=user)
        elif user.role == 'doctor':
            return Appointment.objects.filter(doctor__user=user)
        elif user.role == 'admin':
            return Appointment.objects.all()
        return Appointment.objects.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return AppointmentCreateSerializer
        return AppointmentSerializer

    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)

    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        appointment = self.get_object()
        if appointment.status != 'active':
            return Response({'error': 'Запись уже не активна'}, status=status.HTTP_400_BAD_REQUEST)
        appointment.status = 'cancelled'
        appointment.save()
        return Response({'status': 'Запись отменена'})

    @action(detail=True, methods=['patch'])
    def complete(self, request, pk=None):
        appointment = self.get_object()
        if appointment.status != 'active':
            return Response({'error': 'Запись уже завершена или отменена'}, status=status.HTTP_400_BAD_REQUEST)
        
        appointment.status = 'completed'
        appointment.save()
        
        Visit.objects.create(appointment=appointment)
        
        return Response({'status': 'Приём завершён'})
    
    @action(detail=False, methods=['get'], url_path='available-slots')
    def available_slots(self, request):
        doctor_id = request.query_params.get('doctor_id')
        date_str = request.query_params.get('date')
        
        if not doctor_id or not date_str:
            return Response({'error': 'doctor_id и date обязательны'}, status=400)
        
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Неверный формат даты'}, status=400)
        
        today = timezone.now().date()
        max_date = today + timedelta(days=30)
        
        if target_date < today or target_date > max_date:
            return Response({'free_slots': [], 'slot_duration': 0})
        
        try:
            doctor = DoctorProfile.objects.select_related('specialty').get(id=doctor_id)
        except DoctorProfile.DoesNotExist:
            return Response({'error': 'Врач не найден'}, status=404)
        
        day_of_week = target_date.isoweekday()
        schedule = Schedule.objects.filter(doctor=doctor, day_of_week=day_of_week).first()
        if not schedule:
            return Response({'free_slots': [], 'slot_duration': doctor.slot_duration})
        
        slot_duration = doctor.slot_duration
        start = datetime.combine(target_date, schedule.start_time)
        end = datetime.combine(target_date, schedule.end_time)
        
        start = timezone.make_aware(start)
        end = timezone.make_aware(end)
        
        now = timezone.now()
        
        all_slots = []
        current = start
        while current + timedelta(minutes=slot_duration) <= end:
            all_slots.append(current)
            current += timedelta(minutes=slot_duration)
        
        if target_date == today:
            all_slots = [slot for slot in all_slots if slot > now]
        
        busy_appointments = Appointment.objects.filter(
            doctor=doctor,
            datetime__date=target_date,
            status='active'
        )
        busy_times = [apt.datetime for apt in busy_appointments]
        
        free_slots = [slot for slot in all_slots if slot not in busy_times]
        
        free_slots_str = [slot.strftime('%H:%M') for slot in free_slots]
        
        return Response({
            'free_slots': free_slots_str,
            'slot_duration': slot_duration
        })

class VisitViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = VisitSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Visit.objects.all()
    filterset_fields = ['appointment']  

    def get_queryset(self):
        user = self.request.user
        queryset = Visit.objects.all()
        
        appointment_id = self.request.query_params.get('appointment')
        if appointment_id:
            queryset = queryset.filter(appointment_id=appointment_id)
        
        if user.role == 'patient':
            return queryset.filter(appointment__patient=user)
        elif user.role == 'doctor':
            return queryset.filter(appointment__doctor__user=user)
        elif user.role == 'admin':
            return queryset
        return Visit.objects.none()