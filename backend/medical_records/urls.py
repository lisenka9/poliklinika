from django.urls import path
from .views import MedicalRecordViewSet

urlpatterns = [
    path('records/', MedicalRecordViewSet.as_view({'get': 'list', 'post': 'create'}), name='medical-records'),
    path('create-from-appointment/', MedicalRecordViewSet.as_view({'post': 'create_from_appointment'}), name='create-from-appointment'),
]