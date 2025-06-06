from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin
from .models import User, Team, TeamMembership, Project, Board, Column, Card

# Register with history tracking
admin.site.register(User, SimpleHistoryAdmin)
admin.site.register(Team, SimpleHistoryAdmin)
admin.site.register(TeamMembership, SimpleHistoryAdmin)
admin.site.register(Project, SimpleHistoryAdmin)
admin.site.register(Board, SimpleHistoryAdmin)
admin.site.register(Column, SimpleHistoryAdmin)
admin.site.register(Card, SimpleHistoryAdmin)

# from django.contrib import admin
# from simple_history.admin import SimpleHistoryAdmin
# from .models import User, Team, TeamMembership, Project, Board, Column, Card

# admin.site.register(User)
# admin.site.register(Team, SimpleHistoryAdmin)
# admin.site.register(TeamMembership)
# admin.site.register(Project)
# admin.site.register(Board)
# admin.site.register(Column)
# admin.site.register(Card)

# 
# from django.contrib import admin
# from .models import User, Team, Project, Board, Column, Card

# admin.site.register([User, Team, Project, Board, Column, Card])c