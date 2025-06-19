from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CardViewSet, ColumnViewSet, BoardViewSet, ProjectViewSet, 
    TeamViewSet, TeamMembershipViewSet, RegisterView,
    user_profile, login_view
)

router = DefaultRouter()
router.register(r'cards', CardViewSet)
router.register(r'columns', ColumnViewSet)
router.register(r'boards', BoardViewSet)
router.register(r'projects', ProjectViewSet)
router.register(r'teams', TeamViewSet)
router.register(r'team-memberships', TeamMembershipViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', login_view, name='login'),
    path('profile/', user_profile, name='user_profile'),
]

# from django.urls import path, include
# from rest_framework.routers import DefaultRouter
# from .views import CardViewSet, ColumnViewSet, BoardViewSet, ProjectViewSet, TeamViewSet, TeamMembershipViewSet, RegisterView

# router = DefaultRouter()
# router.register(r'cards', CardViewSet)
# router.register(r'columns', ColumnViewSet)
# router.register(r'boards', BoardViewSet)
# router.register(r'projects', ProjectViewSet)
# router.register(r'teams', TeamViewSet)
# router.register(r'team-memberships', TeamMembershipViewSet)

# urlpatterns = [
#     path('', include(router.urls)),
#     path('register/', RegisterView.as_view(), name='register'),
# ]
