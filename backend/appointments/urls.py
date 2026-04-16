from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AppointmentViewSet, VisitViewSet

router = DefaultRouter()
router.register(r'appointments', AppointmentViewSet)
router.register(r'visits', VisitViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('available-slots/', AppointmentViewSet.as_view({'get': 'available_slots'}), name='available-slots'),
]