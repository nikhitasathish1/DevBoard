from rest_framework import serializers
from .models import User, Team, Project, Board, Column, Card

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']  # Explicit fields for security

class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['id', 'name', 'members']  # Avoid '__all__' if members are sensitive

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'name', 'team']

class BoardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Board
        fields = ['id', 'name', 'project']

class CardSerializer(serializers.ModelSerializer):
    assignee = UserSerializer(read_only=True)  # Nested user details
    class Meta:
        model = Card
        fields = ['id', 'title', 'description', 'column', 'assignee']
        read_only_fields = ['id']

class ColumnSerializer(serializers.ModelSerializer):
    cards = CardSerializer(many=True, read_only=True)  # Nested cards
    class Meta:
        model = Column
        fields = ['id', 'name', 'board', 'cards']
