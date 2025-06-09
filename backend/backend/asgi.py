import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

# Import these AFTER django.setup()
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from core.middleware import JWTAuthMiddleware
import core.routing

print("🔥 Django setup complete")
print("🔥 WebSocket routes imported successfully")
print(f"🔥 Found {len(core.routing.websocket_urlpatterns)} routes")
print("🔐 JWT Authentication middleware enabled")

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(
        URLRouter(
            core.routing.websocket_urlpatterns
        )
    ),
})

print("🔥 ASGI application created successfully with JWT auth")
# import os
# import django

# os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
# django.setup()

# # Import these AFTER django.setup()
# from django.core.asgi import get_asgi_application
# from channels.routing import ProtocolTypeRouter, URLRouter
# from channels.auth import AuthMiddlewareStack
# import core.routing

# print("🔥 Django setup complete")
# print("🔥 WebSocket routes imported successfully")
# print(f"🔥 Found {len(core.routing.websocket_urlpatterns)} routes")

# application = ProtocolTypeRouter({
#     "http": get_asgi_application(),
#     "websocket": AuthMiddlewareStack(
#         URLRouter(
#             core.routing.websocket_urlpatterns
#         )
#     ),
# })

# print("🔥 ASGI application created successfully")
