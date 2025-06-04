from django.contrib import admin
from .models import User, Team, Project, Board, Column, Card

admin.site.register([User, Team, Project, Board, Column, Card])