from rest_framework import viewsets, permissions, generics, status
from .models import Card, Column, Board, Project, Team, TeamMembership
from .serializers import CardSerializer, ColumnSerializer, BoardSerializer, ProjectSerializer, TeamSerializer, RegisterSerializer, TeamMembershipSerializer
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User

class CardViewSet(viewsets.ModelViewSet):
    queryset = Card.objects.all()
    serializer_class = CardSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Filter cards based on user's access to boards
        return Card.objects.filter(column__board__project__team__members=self.request.user)

class ColumnViewSet(viewsets.ModelViewSet):
    queryset = Column.objects.all()
    serializer_class = ColumnSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Filter columns based on user's access to boards
        return Column.objects.filter(board__project__team__members=self.request.user)

class BoardViewSet(viewsets.ModelViewSet):
    queryset = Board.objects.all()
    serializer_class = BoardSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Filter boards based on user's team membership
        return Board.objects.filter(project__team__members=self.request.user)
    
    @action(detail=True, methods=['get'])
    def full_board(self, request, pk=None):
        """Get board with all columns and cards"""
        try:
            board = self.get_object()
            columns = board.columns.all().prefetch_related('cards')
            
            board_data = {
                'id': board.id,
                'name': board.name,
                'description': board.description,
                'columns': [
                    {
                        'id': col.id,
                        'name': col.name,
                        'position': col.position,
                        'cards': [
                            {
                                'id': card.id,
                                'title': card.title,
                                'description': card.description,
                                'position': card.position,
                                'assigned_to': card.assigned_to.username if card.assigned_to else None,
                                'created_at': card.created_at,
                                'updated_at': card.updated_at,
                            }
                            for card in col.cards.all().order_by('position')
                        ]
                    }
                    for col in columns.order_by('position')
                ]
            }
            return Response(board_data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Filter projects based on user's team membership
        return Project.objects.filter(team__members=self.request.user)

class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Only show teams user is a member of
        return Team.objects.filter(members=self.request.user)

class TeamMembershipViewSet(viewsets.ModelViewSet):
    queryset = TeamMembership.objects.all()
    serializer_class = TeamMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Only show memberships for teams user belongs to
        return TeamMembership.objects.filter(team__members=self.request.user)

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            },
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_profile(request):
    """Get current user profile"""
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
    })

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    """Custom login view that returns user data with tokens"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({
            'error': 'Username and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(username=username, password=password)
    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            },
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })
    else:
        return Response({
            'error': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)

# from rest_framework import viewsets, permissions, generics
# from .models import Card, Column, Board, Project, Team, TeamMembership
# from .serializers import CardSerializer, ColumnSerializer, BoardSerializer, ProjectSerializer, TeamSerializer, RegisterSerializer, TeamMembershipSerializer
# from rest_framework.response import Response
# from rest_framework.decorators import api_view, permission_classes
# from django.contrib.auth import authenticate
# from rest_framework.authtoken.models import Token

# class CardViewSet(viewsets.ModelViewSet):
#     queryset = Card.objects.all()
#     serializer_class = CardSerializer

# class ColumnViewSet(viewsets.ModelViewSet):
#     queryset = Column.objects.all()
#     serializer_class = ColumnSerializer

# class BoardViewSet(viewsets.ModelViewSet):
#     queryset = Board.objects.all()
#     serializer_class = BoardSerializer

# class ProjectViewSet(viewsets.ModelViewSet):
#     queryset = Project.objects.all()
#     serializer_class = ProjectSerializer

# class TeamViewSet(viewsets.ModelViewSet):
#     queryset = Team.objects.all()
#     serializer_class = TeamSerializer

# class TeamMembershipViewSet(viewsets.ModelViewSet):
#     queryset = TeamMembership.objects.all()
#     serializer_class = TeamMembershipSerializer

# class RegisterView(generics.CreateAPIView):
#     serializer_class = RegisterSerializer
#     permission_classes = [permissions.AllowAny]