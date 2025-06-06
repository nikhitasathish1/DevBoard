from django.contrib.auth.models import AbstractUser
from django.db import models
from simple_history.models import HistoricalRecords

# Custom user model (extensible)
class User(AbstractUser):
    pass

# Team model with many-to-many membership through TeamMembership
class Team(models.Model):
    name = models.CharField(max_length=100)
    members = models.ManyToManyField(
        User,
        through='TeamMembership',
        related_name='teams'
    )
    history = HistoricalRecords()

    def __str__(self):
        return self.name

# Through model to manage roles in a Team
class TeamMembership(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('member', 'Member'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    history = HistoricalRecords()

    class Meta:
        unique_together = ('user', 'team')

# Project belongs to a Team
class Project(models.Model):
    name = models.CharField(max_length=100)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    history = HistoricalRecords()

    def __str__(self):
        return self.name

# Board belongs to a Project
class Board(models.Model):
    name = models.CharField(max_length=100)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    history = HistoricalRecords()

    def __str__(self):
        return self.name

# Column belongs to a Board
class Column(models.Model):
    name = models.CharField(max_length=100)
    board = models.ForeignKey(Board, on_delete=models.CASCADE)
    history = HistoricalRecords()

    def __str__(self):
        return self.name

# Card belongs to a Column and optionally assigned to a User
class Card(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    column = models.ForeignKey(Column, on_delete=models.CASCADE)
    assignee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    history = HistoricalRecords()

    def __str__(self):
        return self.title

# from django.contrib.auth.models import AbstractUser
# from django.db import models
# from django.contrib.auth.models import User
# from simple_history.models import HistoricalRecords

# class User(AbstractUser):
#     pass

# class Team(models.Model):
#     name = models.CharField(max_length=100)
#     members = models.ManyToManyField(User,through='TeamMembership',related_name='teams')
#     history = HistoricalRecords()
    
#     def __str__(self):
#         return self.name

# class TeamMembership(models.Model):
#     ROLE_CHOICES = [
#         ('admin', 'Admin'),
#         ('member', 'Member'),
#     ]
#     user = models.ForeignKey(User, on_delete=models.CASCADE)
#     team = models.ForeignKey(Team, on_delete=models.CASCADE)
#     role = models.CharField(max_length=10, choices=ROLE_CHOICES)
#     history = HistoricalRecords()

# class Project(models.Model):
#     name = models.CharField(max_length=100)
#     team = models.ForeignKey(Team, on_delete=models.CASCADE)
#     history = HistoricalRecords()

# class Board(models.Model):
#     name = models.CharField(max_length=100)
#     project = models.ForeignKey(Project, on_delete=models.CASCADE)
#     history = HistoricalRecords()

# class Column(models.Model):
#     name = models.CharField(max_length=100)
#     board = models.ForeignKey(Board, on_delete=models.CASCADE)
#     history = HistoricalRecords()

# class Card(models.Model):
#     title = models.CharField(max_length=255)
#     description = models.TextField(blank=True)
#     column = models.ForeignKey(Column, on_delete=models.CASCADE)
#     assignee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
#     history = HistoricalRecords()

# # from django.contrib.auth.models import AbstractUser
# # from django.db import models
# # from simple_history.models import HistoricalRecords

# # class User(AbstractUser):
# #     pass

# # class Team(models.Model):
# #     name = models.CharField(max_length=100)
# #     #members = models.ManyToManyField(User, through='TeamMembership')
# #     history = HistoricalRecords()

# # class TeamMembership(models.Model):
# #     ROLE_CHOICES = [
# #         ('admin', 'Admin'),
# #         ('member', 'Member'),
# #     ]
# #     user = models.ForeignKey(User, on_delete=models.CASCADE)
# #     team = models.ForeignKey(Team, on_delete=models.CASCADE)
# #     role = models.CharField(max_length=10, choices=ROLE_CHOICES)
# #     history = HistoricalRecords()

# # class Project(models.Model):
# #     name = models.CharField(max_length=100)
# #     team = models.ForeignKey(Team, on_delete=models.CASCADE)
# #     history = HistoricalRecords()

# # class Board(models.Model):
# #     name = models.CharField(max_length=100)
# #     project = models.ForeignKey(Project, on_delete=models.CASCADE)
# #     history = HistoricalRecords()

# # class Column(models.Model):
# #     name = models.CharField(max_length=100)
# #     board = models.ForeignKey(Board, on_delete=models.CASCADE)
# #     history = HistoricalRecords()

# # class Card(models.Model):
# #     title = models.CharField(max_length=255)
# #     description = models.TextField(blank=True)
# #     column = models.ForeignKey(Column, on_delete=models.CASCADE)
# #     assignee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
# #     history = HistoricalRecords()