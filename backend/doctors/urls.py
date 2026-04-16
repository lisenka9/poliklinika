from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SpecialtyViewSet, DoctorProfileViewSet, ScheduleViewSet

router = DefaultRouter()
router.register(r'specialties', SpecialtyViewSet)
router.register(r'profiles', DoctorProfileViewSet)
router.register(r'schedules', ScheduleViewSet)

urlpatterns = [
    path('', include(router.urls)),
]