from django.urls import re_path
from . import consumers

print("🔥 WebSocket routing.py loaded!")

websocket_urlpatterns = [
    re_path(r'ws/boards/(?P<board_id>\w+)/$', consumers.BoardConsumer.as_asgi()),
]

print(f"🔥 Registered {len(websocket_urlpatterns)} WebSocket routes")
print(f"🔥 Route pattern: ws/boards/(?P<board_id>\\w+)/$")

# from django.urls import re_path
# from . import consumers

# websocket_urlpatterns = [
#     re_path(r'ws/boards/(?P<board_id>\w+)/$', consumers.BoardConsumer.as_asgi()),
# ]
# from django.urls import re_path
# from . import consumers

# websocket_urlpatterns = [
#     re_path(r'^ws/boards/(?P<board_id>[\w-]+)/$', consumers.BoardConsumer.as_asgi()),
# ]

