from rest_framework import serializers
from .models import User, Team, TeamMembership, Project, Board, Column, Card
from django.contrib.auth.password_validation import validate_password

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    class Meta:
        model = User
        fields = ['username', 'email', 'password']
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = '__all__'

class TeamMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamMembership
        fields = '__all__'

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'

class BoardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Board
        fields = '__all__'

class ColumnSerializer(serializers.ModelSerializer):
    class Meta:
        model = Column
        fields = '__all__'

class CardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Card
        fields = '__all__'

# from rest_framework import serializers
# from .models import User, Team, TeamMembership, Project, Board, Column, Card
# from django.contrib.auth.password_validation import validate_password

# class UserSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = User
#         fields = ['id', 'username', 'email']  # Explicit fields for security

# class RegisterSerializer(serializers.ModelSerializer):
#     password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
#     class Meta:
#         model = User
#         fields = ['username', 'email', 'password']
#     def create(self, validated_data):
#         user = User.objects.create_user(
#             username=validated_data['username'],
#             email=validated_data['email'],
#             password=validated_data['password']
#         )
#         return user

# class TeamSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Team
#         fields = ['id', 'name', 'members']  # Avoid '__all__' if members are sensitive

# class ProjectSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Project
#         fields = ['id', 'name', 'team']

# class BoardSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Board
#         fields = ['id', 'name', 'project']

# class CardSerializer(serializers.ModelSerializer):
#     assignee = UserSerializer(read_only=True)  # Nested user details
#     class Meta:
#         model = Card
#         fields = ['id', 'title', 'description', 'column', 'assignee']
#         read_only_fields = ['id']

# class ColumnSerializer(serializers.ModelSerializer):
#     cards = CardSerializer(many=True, read_only=True)  # Nested cards
#     class Meta:
#         model = Column
#         fields = ['id', 'name', 'board', 'cards']
