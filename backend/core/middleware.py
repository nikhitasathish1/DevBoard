from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from jwt import decode as jwt_decode
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections
import logging

User = get_user_model()
logger = logging.getLogger(__name__)

@database_sync_to_async
def get_user_by_id(user_id):
    """Get user by ID from database"""
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()

async def get_user_from_token(token):
    """Validate JWT token and return user"""
    try:
        # Validate token using SimpleJWT
        UntypedToken(token)
        
        # Decode token to get user data
        decoded_data = jwt_decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=["HS256"]
        )
        
        user_id = decoded_data.get('user_id')
        if not user_id:
            logger.warning("No user_id found in token")
            return AnonymousUser()
        
        user = await get_user_by_id(user_id)
        return user
        
    except (InvalidToken, TokenError) as e:
        logger.warning(f"Invalid JWT token: {str(e)}")
        return AnonymousUser()
    except Exception as e:
        logger.error(f"Error validating token: {str(e)}")
        return AnonymousUser()

class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware to authenticate WebSocket connections using JWT tokens.
    Token can be provided via:
    1. Query parameter: ws://localhost:8000/ws/boards/1/?token=your_jwt_token
    2. Authorization header: Authorization: Bearer your_jwt_token
    """
    
    async def __call__(self, scope, receive, send):
        # Close old database connections
        close_old_connections()
        
        # Extract token from query string or headers
        token = await self.get_token_from_scope(scope)
        
        if token:
            # Authenticate user with token
            scope["user"] = await get_user_from_token(token)
        else:
            # No token provided
            scope["user"] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)
    
    async def get_token_from_scope(self, scope):
        """Extract JWT token from WebSocket scope (query string or headers)"""
        token = None
        
        try:
            # Try to get token from query string first
            query_string = scope.get('query_string', b'').decode()
            query_params = parse_qs(query_string)
            
            if 'token' in query_params:
                token = query_params['token'][0]
                logger.debug("Token found in query string")
                return token
            
            # Try to get from headers as fallback
            headers = dict(scope.get('headers', []))
            auth_header = headers.get(b'authorization', b'').decode()
            
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                logger.debug("Token found in Authorization header")
                return token
            
            # Also check for lowercase 'authorization' header
            auth_header = headers.get(b'Authorization', b'').decode()
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                logger.debug("Token found in Authorization header (capitalized)")
                return token
                
        except Exception as e:
            logger.error(f"Error extracting token from scope: {str(e)}")
        
        return None