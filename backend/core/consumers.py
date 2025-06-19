import json
import logging
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Card, Column, Board, Project, Team  # Added Project and Team models
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from jwt import decode as jwt_decode
from django.conf import settings

User = get_user_model()
logger = logging.getLogger(__name__)


class BoardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.board_id = self.scope['url_route']['kwargs']['board_id']
        self.room_group_name = f"board_{self.board_id}"
        self.user = None
        
        # Authenticate user
        user = await self.get_user_from_token()
        if not user:
            await self.close()
            return
        
        self.user = user
        
        # Check if user has access to this board (optional)
        has_access = await self.check_board_access(self.board_id, user)
        if not has_access:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        
        # Send welcome message with user info
        await self.send(text_data=json.dumps({
            "type": "connection.established",
            "payload": {
                "user_id": user.id,
                "username": user.username,
                "board_id": self.board_id
            }
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            event_type = data.get("type")
            payload = data.get("payload")
            
            if not event_type or not payload:
                await self.send_error("Missing 'type' or 'payload' in message")
                return
            
            # Handle card events
            if event_type == "card.created":
                await self.handle_card_created(payload)
            elif event_type == "card.updated":
                await self.handle_card_updated(payload)
            elif event_type == "card.deleted":
                await self.handle_card_deleted(payload)
            elif event_type == "card.moved":  # NEW: Added card move functionality
                await self.handle_card_moved(payload)
            
            # Handle column events
            elif event_type == "column.created":
                await self.handle_column_created(payload)
            elif event_type == "column.updated":
                await self.handle_column_updated(payload)
            elif event_type == "column.deleted":
                await self.handle_column_deleted(payload)
            
            # Handle board events
            elif event_type == "board.updated":
                await self.handle_board_updated(payload)
            
            # NEW: Handle project events
            elif event_type == "project.renamed":
                await self.handle_project_renamed(payload)
            
            # NEW: Handle team events
            elif event_type == "team.updated":
                await self.handle_team_updated(payload)
            
            else:
                await self.send_error(f"Unknown event type: {event_type}")
                return
            
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON format")
        except Exception as e:
            logger.error(f"Unexpected error in WebSocket consumer: {str(e)}")
            await self.send_error("An unexpected error occurred")

    # Authentication methods
    async def get_user_from_token(self):
        """Extract and validate JWT token from query string or headers"""
        try:
            # Try to get token from query string first
            query_string = self.scope.get('query_string', b'').decode()
            query_params = parse_qs(query_string)
            token = None
            
            if 'token' in query_params:
                token = query_params['token'][0]
            else:
                # Try to get from headers
                headers = dict(self.scope.get('headers', []))
                auth_header = headers.get(b'authorization', b'').decode()
                if auth_header.startswith('Bearer '):
                    token = auth_header.split(' ')[1]
            
            if not token:
                logger.warning("No token provided in WebSocket connection")
                return None
            
            # Validate token
            try:
                UntypedToken(token)
                decoded_data = jwt_decode(
                    token, 
                    settings.SECRET_KEY, 
                    algorithms=["HS256"]
                )
                user_id = decoded_data.get('user_id')
                user = await self.get_user_by_id(user_id)
                return user
            except (InvalidToken, TokenError, Exception) as e:
                logger.warning(f"Invalid token: {str(e)}")
                return None
                
        except Exception as e:
            logger.error(f"Error extracting token: {str(e)}")
            return None

    @database_sync_to_async
    def get_user_by_id(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except ObjectDoesNotExist:
            return None

    @database_sync_to_async
    def check_board_access(self, board_id, user):
        """Check if user has access to this board"""
        try:
            # You can customize this logic based on your board permissions
            board = Board.objects.get(id=board_id)
            # For now, allow access to all authenticated users
            # You can add more sophisticated permission checks here
            return True
        except ObjectDoesNotExist:
            return False

    # Card event handlers
    async def handle_card_created(self, payload):
        try:
            card = await self.create_card(payload)
            response = {
                "type": "card.created",
                "payload": {
                    "id": card.id,
                    "title": card.title,
                    "description": getattr(card, 'description', ''),
                    "column_id": card.column_id,
                    "assignee": card.assignee_id,
                    "created_by": self.user.id,
                    "created_at": card.created_at.isoformat() if hasattr(card, 'created_at') else None,
                    "position": getattr(card, 'position', 0)  # Added position for ordering
                }
            }
            await self.broadcast_event(response)
        except Exception as e:
            await self.send_error(f"Failed to create card: {str(e)}")

    async def handle_card_updated(self, payload):
        try:
            card = await self.update_card(payload)
            response = {
                "type": "card.updated",
                "payload": {
                    "id": card.id,
                    "title": card.title,
                    "description": getattr(card, 'description', ''),
                    "column_id": card.column_id,
                    "assignee": card.assignee_id,
                    "updated_by": self.user.id,
                    "position": getattr(card, 'position', 0)
                }
            }
            await self.broadcast_event(response)
        except Exception as e:
            await self.send_error(f"Failed to update card: {str(e)}")

    # NEW: Card move handler
    async def handle_card_moved(self, payload):
        try:
            card = await self.move_card(payload)
            response = {
                "type": "card.moved",
                "payload": {
                    "id": card.id,
                    "title": card.title,
                    "description": getattr(card, 'description', ''),
                    "old_column_id": payload.get("old_column_id"),
                    "new_column_id": card.column_id,
                    "old_position": payload.get("old_position"),
                    "new_position": getattr(card, 'position', 0),
                    "moved_by": self.user.id
                }
            }
            await self.broadcast_event(response)
        except Exception as e:
            await self.send_error(f"Failed to move card: {str(e)}")

    async def handle_card_deleted(self, payload):
        try:
            card_id = payload.get("id") or payload.get("card_id")
            if not card_id:
                await self.send_error("Missing card ID for deletion")
                return
            
            # Get card info before deletion for broadcast
            card_info = await self.get_card_info(card_id)
            await self.delete_card(card_id)
            
            response = {
                "type": "card.deleted",
                "payload": {
                    "id": card_id,
                    "column_id": card_info.get("column_id") if card_info else None,
                    "deleted_by": self.user.id
                }
            }
            await self.broadcast_event(response)
        except Exception as e:
            await self.send_error(f"Failed to delete card: {str(e)}")

    # Column event handlers
    async def handle_column_created(self, payload):
        try:
            column = await self.create_column(payload)
            response = {
                "type": "column.created",
                "payload": {
                    "id": column.id,
                    "title": column.title,
                    "board_id": column.board_id,
                    "position": getattr(column, 'position', 0),
                    "created_by": self.user.id,
                    "created_at": column.created_at.isoformat() if hasattr(column, 'created_at') else None
                }
            }
            await self.broadcast_event(response)
        except Exception as e:
            await self.send_error(f"Failed to create column: {str(e)}")

    async def handle_column_updated(self, payload):
        try:
            column = await self.update_column(payload)
            response = {
                "type": "column.updated",
                "payload": {
                    "id": column.id,
                    "title": column.title,
                    "board_id": column.board_id,
                    "position": getattr(column, 'position', 0),
                    "updated_by": self.user.id
                }
            }
            await self.broadcast_event(response)
        except Exception as e:
            await self.send_error(f"Failed to update column: {str(e)}")

    async def handle_column_deleted(self, payload):
        try:
            column_id = payload.get("id") or payload.get("column_id")
            if not column_id:
                await self.send_error("Missing column ID for deletion")
                return
            
            await self.delete_column(column_id)
            response = {
                "type": "column.deleted",
                "payload": {
                    "id": column_id,
                    "deleted_by": self.user.id
                }
            }
            await self.broadcast_event(response)
        except Exception as e:
            await self.send_error(f"Failed to delete column: {str(e)}")

    # Board event handlers
    async def handle_board_updated(self, payload):
        try:
            board = await self.update_board(payload)
            response = {
                "type": "board.updated",
                "payload": {
                    "id": board.id,
                    "title": board.title,
                    "description": getattr(board, 'description', ''),
                    "updated_by": self.user.id
                }
            }
            await self.broadcast_event(response)
        except Exception as e:
            await self.send_error(f"Failed to update board: {str(e)}")

    # NEW: Project event handlers
    async def handle_project_renamed(self, payload):
        try:
            project = await self.rename_project(payload)
            response = {
                "type": "project.renamed",
                "payload": {
                    "id": project.id,
                    "old_name": payload.get("old_name"),
                    "new_name": project.name,
                    "renamed_by": self.user.id
                }
            }
            await self.broadcast_event(response)
        except Exception as e:
            await self.send_error(f"Failed to rename project: {str(e)}")

    # NEW: Team event handlers
    async def handle_team_updated(self, payload):
        try:
            team = await self.update_team(payload)
            # Get team members for the response
            team_members = await self.get_team_members(team.id)
            
            response = {
                "type": "team.updated",
                "payload": {
                    "id": team.id,
                    "name": team.name,
                    "members": team_members,
                    "updated_by": self.user.id
                }
            }
            await self.broadcast_event(response)
        except Exception as e:
            await self.send_error(f"Failed to update team: {str(e)}")

    # Utility methods
    async def send_error(self, error_message):
        """Send error message to client"""
        await self.send(text_data=json.dumps({
            "type": "error",
            "payload": {
                "message": error_message
            }
        }))

    async def broadcast_event(self, event):
        """Broadcast event to all connected clients in the board"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_message",  # Fixed: Changed from "broadcast_event" to avoid recursion
                "event": event
            }
        )

    async def broadcast_message(self, event):
        """Handle broadcast from channel layer"""
        await self.send(text_data=json.dumps(event["event"]))

    # Database operations - Cards
    @database_sync_to_async
    def create_card(self, payload):
        try:
            column = Column.objects.get(id=payload["column_id"])
        except KeyError:
            raise ValueError("Missing required field: column_id")
        except ObjectDoesNotExist:
            raise ValueError(f"Column with id {payload['column_id']} does not exist")
        
        try:
            title = payload["title"]
        except KeyError:
            raise ValueError("Missing required field: title")
        
        assignee = None
        if payload.get("assignee"):
            try:
                assignee = User.objects.get(id=payload["assignee"])
            except ObjectDoesNotExist:
                raise ValueError(f"User with id {payload['assignee']} does not exist")
        
        return Card.objects.create(
            title=title,
            description=payload.get("description", ""),
            column=column,
            assignee=assignee,
            position=payload.get("position", 0)
        )

    @database_sync_to_async
    def update_card(self, payload):
        card_id = payload.get("id") or payload.get("card_id")
        if not card_id:
            raise ValueError("Missing card ID (use 'id' or 'card_id')")
        
        try:
            card = Card.objects.get(id=card_id)
        except ObjectDoesNotExist:
            raise ValueError(f"Card with id {card_id} does not exist")
        
        if "title" in payload:
            card.title = payload["title"]
        
        if "description" in payload:
            card.description = payload["description"]
        
        if "column_id" in payload:
            try:
                Column.objects.get(id=payload["column_id"])
                card.column_id = payload["column_id"]
            except ObjectDoesNotExist:
                raise ValueError(f"Column with id {payload['column_id']} does not exist")
        
        if "assignee" in payload:
            if payload["assignee"] is None:
                card.assignee = None
            else:
                try:
                    assignee = User.objects.get(id=payload["assignee"])
                    card.assignee = assignee
                except ObjectDoesNotExist:
                    raise ValueError(f"User with id {payload['assignee']} does not exist")
        
        if "position" in payload:
            card.position = payload["position"]
        
        card.save()
        return card

    # NEW: Move card method
    @database_sync_to_async
    def move_card(self, payload):
        card_id = payload.get("id") or payload.get("card_id")
        if not card_id:
            raise ValueError("Missing card ID (use 'id' or 'card_id')")
        
        try:
            card = Card.objects.get(id=card_id)
        except ObjectDoesNotExist:
            raise ValueError(f"Card with id {card_id} does not exist")
        
        # Update column if provided
        if "new_column_id" in payload:
            try:
                new_column = Column.objects.get(id=payload["new_column_id"])
                card.column = new_column
            except ObjectDoesNotExist:
                raise ValueError(f"Column with id {payload['new_column_id']} does not exist")
        
        # Update position if provided
        if "new_position" in payload:
            card.position = payload["new_position"]
        
        card.save()
        return card

    # NEW: Get card info method
    @database_sync_to_async
    def get_card_info(self, card_id):
        try:
            card = Card.objects.get(id=card_id)
            return {
                "id": card.id,
                "title": card.title,
                "column_id": card.column_id
            }
        except ObjectDoesNotExist:
            return None

    @database_sync_to_async
    def delete_card(self, card_id):
        try:
            card = Card.objects.get(id=card_id)
            card.delete()
        except ObjectDoesNotExist:
            raise ValueError(f"Card with id {card_id} does not exist")

    # Database operations - Columns
    @database_sync_to_async
    def create_column(self, payload):
        try:
            board = Board.objects.get(id=self.board_id)
        except ObjectDoesNotExist:
            raise ValueError(f"Board with id {self.board_id} does not exist")
        
        try:
            title = payload["title"]
        except KeyError:
            raise ValueError("Missing required field: title")
        
        return Column.objects.create(
            title=title,
            board=board,
            position=payload.get("position", 0)
        )

    @database_sync_to_async
    def update_column(self, payload):
        column_id = payload.get("id") or payload.get("column_id")
        if not column_id:
            raise ValueError("Missing column ID (use 'id' or 'column_id')")
        
        try:
            column = Column.objects.get(id=column_id)
        except ObjectDoesNotExist:
            raise ValueError(f"Column with id {column_id} does not exist")
        
        if "title" in payload:
            column.title = payload["title"]
        
        if "position" in payload:
            column.position = payload["position"]
        
        column.save()
        return column

    @database_sync_to_async
    def delete_column(self, column_id):
        try:
            column = Column.objects.get(id=column_id)
            # Note: This will also delete all cards in the column due to CASCADE
            column.delete()
        except ObjectDoesNotExist:
            raise ValueError(f"Column with id {column_id} does not exist")

    # Database operations - Board
    @database_sync_to_async
    def update_board(self, payload):
        try:
            board = Board.objects.get(id=self.board_id)
        except ObjectDoesNotExist:
            raise ValueError(f"Board with id {self.board_id} does not exist")
        
        if "title" in payload:
            board.title = payload["title"]
        
        if "description" in payload:
            board.description = payload["description"]
        
        board.save()
        return board

    # NEW: Database operations - Project
    @database_sync_to_async
    def rename_project(self, payload):
        project_id = payload.get("id") or payload.get("project_id")
        if not project_id:
            raise ValueError("Missing project ID (use 'id' or 'project_id')")
        
        try:
            project = Project.objects.get(id=project_id)
        except ObjectDoesNotExist:
            raise ValueError(f"Project with id {project_id} does not exist")
        
        if "name" in payload:
            project.name = payload["name"]
        elif "new_name" in payload:
            project.name = payload["new_name"]
        else:
            raise ValueError("Missing required field: name or new_name")
        
        project.save()
        return project

    # NEW: Database operations - Team
    @database_sync_to_async
    def update_team(self, payload):
        team_id = payload.get("id") or payload.get("team_id")
        if not team_id:
            raise ValueError("Missing team ID (use 'id' or 'team_id')")
        
        try:
            team = Team.objects.get(id=team_id)
        except ObjectDoesNotExist:
            raise ValueError(f"Team with id {team_id} does not exist")
        
        if "name" in payload:
            team.name = payload["name"]
        
        # Handle member updates if provided
        if "members" in payload:
            # Clear existing members and add new ones
            team.members.clear()
            for member_id in payload["members"]:
                try:
                    user = User.objects.get(id=member_id)
                    team.members.add(user)
                except ObjectDoesNotExist:
                    logger.warning(f"User with id {member_id} does not exist, skipping")
        
        team.save()
        return team

    # NEW: Get team members
    @database_sync_to_async
    def get_team_members(self, team_id):
        try:
            team = Team.objects.get(id=team_id)
            return [
                {
                    "id": member.id,
                    "username": member.username,
                    "email": getattr(member, 'email', ''),
                    "first_name": getattr(member, 'first_name', ''),
                    "last_name": getattr(member, 'last_name', '')
                }
                for member in team.members.all()
            ]
        except ObjectDoesNotExist:
            return []

# import json
# import logging
# from urllib.parse import parse_qs
# from channels.generic.websocket import AsyncWebsocketConsumer
# from channels.db import database_sync_to_async
# from .models import Card, Column, Board
# from django.contrib.auth import get_user_model
# from django.core.exceptions import ObjectDoesNotExist
# from rest_framework_simplejwt.tokens import UntypedToken
# from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
# from jwt import decode as jwt_decode
# from django.conf import settings

# User = get_user_model()
# logger = logging.getLogger(__name__)


# class BoardConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         self.board_id = self.scope['url_route']['kwargs']['board_id']
#         self.room_group_name = f"board_{self.board_id}"
#         self.user = None
        
#         # Authenticate user
#         user = await self.get_user_from_token()
#         if not user:
#             await self.close()
#             return
        
#         self.user = user
        
#         # Check if user has access to this board (optional)
#         has_access = await self.check_board_access(self.board_id, user)
#         if not has_access:
#             await self.close()
#             return

#         await self.channel_layer.group_add(
#             self.room_group_name,
#             self.channel_name
#         )

#         await self.accept()
        
#         # Send welcome message with user info
#         await self.send(text_data=json.dumps({
#             "type": "connection.established",
#             "payload": {
#                 "user_id": user.id,
#                 "username": user.username,
#                 "board_id": self.board_id
#             }
#         }))

#     async def disconnect(self, close_code):
#         await self.channel_layer.group_discard(
#             self.room_group_name,
#             self.channel_name
#         )

#     async def receive(self, text_data):
#         try:
#             data = json.loads(text_data)
#             event_type = data.get("type")
#             payload = data.get("payload")
            
#             if not event_type or not payload:
#                 await self.send_error("Missing 'type' or 'payload' in message")
#                 return
            
#             # Handle card events
#             if event_type == "card.created":
#                 await self.handle_card_created(payload)
#             elif event_type == "card.updated":
#                 await self.handle_card_updated(payload)
#             elif event_type == "card.deleted":
#                 await self.handle_card_deleted(payload)
            
#             # Handle column events
#             elif event_type == "column.created":
#                 await self.handle_column_created(payload)
#             elif event_type == "column.updated":
#                 await self.handle_column_updated(payload)
#             elif event_type == "column.deleted":
#                 await self.handle_column_deleted(payload)
            
#             # Handle board events
#             elif event_type == "board.updated":
#                 await self.handle_board_updated(payload)
            
#             else:
#                 await self.send_error(f"Unknown event type: {event_type}")
#                 return
            
#         except json.JSONDecodeError:
#             await self.send_error("Invalid JSON format")
#         except Exception as e:
#             logger.error(f"Unexpected error in WebSocket consumer: {str(e)}")
#             await self.send_error("An unexpected error occurred")

#     # Authentication methods
#     async def get_user_from_token(self):
#         """Extract and validate JWT token from query string or headers"""
#         try:
#             # Try to get token from query string first
#             query_string = self.scope.get('query_string', b'').decode()
#             query_params = parse_qs(query_string)
#             token = None
            
#             if 'token' in query_params:
#                 token = query_params['token'][0]
#             else:
#                 # Try to get from headers
#                 headers = dict(self.scope.get('headers', []))
#                 auth_header = headers.get(b'authorization', b'').decode()
#                 if auth_header.startswith('Bearer '):
#                     token = auth_header.split(' ')[1]
            
#             if not token:
#                 logger.warning("No token provided in WebSocket connection")
#                 return None
            
#             # Validate token
#             try:
#                 UntypedToken(token)
#                 decoded_data = jwt_decode(
#                     token, 
#                     settings.SECRET_KEY, 
#                     algorithms=["HS256"]
#                 )
#                 user_id = decoded_data.get('user_id')
#                 user = await self.get_user_by_id(user_id)
#                 return user
#             except (InvalidToken, TokenError, Exception) as e:
#                 logger.warning(f"Invalid token: {str(e)}")
#                 return None
                
#         except Exception as e:
#             logger.error(f"Error extracting token: {str(e)}")
#             return None

#     @database_sync_to_async
#     def get_user_by_id(self, user_id):
#         try:
#             return User.objects.get(id=user_id)
#         except ObjectDoesNotExist:
#             return None

#     @database_sync_to_async
#     def check_board_access(self, board_id, user):
#         """Check if user has access to this board"""
#         try:
#             # You can customize this logic based on your board permissions
#             board = Board.objects.get(id=board_id)
#             # For now, allow access to all authenticated users
#             # You can add more sophisticated permission checks here
#             return True
#         except ObjectDoesNotExist:
#             return False

#     # Card event handlers
#     async def handle_card_created(self, payload):
#         try:
#             card = await self.create_card(payload)
#             response = {
#                 "type": "card.created",
#                 "payload": {
#                     "id": card.id,
#                     "title": card.title,
#                     "description": getattr(card, 'description', ''),
#                     "column_id": card.column_id,
#                     "assignee": card.assignee_id,
#                     "created_by": self.user.id,
#                     "created_at": card.created_at.isoformat() if hasattr(card, 'created_at') else None
#                 }
#             }
#             await self.broadcast_event(response)
#         except Exception as e:
#             await self.send_error(f"Failed to create card: {str(e)}")

#     async def handle_card_updated(self, payload):
#         try:
#             card = await self.update_card(payload)
#             response = {
#                 "type": "card.updated",
#                 "payload": {
#                     "id": card.id,
#                     "title": card.title,
#                     "description": getattr(card, 'description', ''),
#                     "column_id": card.column_id,
#                     "assignee": card.assignee_id,
#                     "updated_by": self.user.id
#                 }
#             }
#             await self.broadcast_event(response)
#         except Exception as e:
#             await self.send_error(f"Failed to update card: {str(e)}")

#     async def handle_card_deleted(self, payload):
#         try:
#             card_id = payload.get("id") or payload.get("card_id")
#             if not card_id:
#                 await self.send_error("Missing card ID for deletion")
#                 return
            
#             await self.delete_card(card_id)
#             response = {
#                 "type": "card.deleted",
#                 "payload": {
#                     "id": card_id,
#                     "deleted_by": self.user.id
#                 }
#             }
#             await self.broadcast_event(response)
#         except Exception as e:
#             await self.send_error(f"Failed to delete card: {str(e)}")

#     # Column event handlers
#     async def handle_column_created(self, payload):
#         try:
#             column = await self.create_column(payload)
#             response = {
#                 "type": "column.created",
#                 "payload": {
#                     "id": column.id,
#                     "title": column.title,
#                     "board_id": column.board_id,
#                     "position": getattr(column, 'position', 0),
#                     "created_by": self.user.id,
#                     "created_at": column.created_at.isoformat() if hasattr(column, 'created_at') else None
#                 }
#             }
#             await self.broadcast_event(response)
#         except Exception as e:
#             await self.send_error(f"Failed to create column: {str(e)}")

#     async def handle_column_updated(self, payload):
#         try:
#             column = await self.update_column(payload)
#             response = {
#                 "type": "column.updated",
#                 "payload": {
#                     "id": column.id,
#                     "title": column.title,
#                     "board_id": column.board_id,
#                     "position": getattr(column, 'position', 0),
#                     "updated_by": self.user.id
#                 }
#             }
#             await self.broadcast_event(response)
#         except Exception as e:
#             await self.send_error(f"Failed to update column: {str(e)}")

#     async def handle_column_deleted(self, payload):
#         try:
#             column_id = payload.get("id") or payload.get("column_id")
#             if not column_id:
#                 await self.send_error("Missing column ID for deletion")
#                 return
            
#             await self.delete_column(column_id)
#             response = {
#                 "type": "column.deleted",
#                 "payload": {
#                     "id": column_id,
#                     "deleted_by": self.user.id
#                 }
#             }
#             await self.broadcast_event(response)
#         except Exception as e:
#             await self.send_error(f"Failed to delete column: {str(e)}")

#     # Board event handlers
#     async def handle_board_updated(self, payload):
#         try:
#             board = await self.update_board(payload)
#             response = {
#                 "type": "board.updated",
#                 "payload": {
#                     "id": board.id,
#                     "title": board.title,
#                     "description": getattr(board, 'description', ''),
#                     "updated_by": self.user.id
#                 }
#             }
#             await self.broadcast_event(response)
#         except Exception as e:
#             await self.send_error(f"Failed to update board: {str(e)}")

#     # Utility methods
#     async def send_error(self, error_message):
#         """Send error message to client"""
#         await self.send(text_data=json.dumps({
#             "type": "error",
#             "payload": {
#                 "message": error_message
#             }
#         }))

#     async def broadcast_event(self, event):
#         """Broadcast event to all connected clients in the board"""
#         await self.channel_layer.group_send(
#             self.room_group_name,
#             {
#                 "type": "broadcast_event",
#                 "event": event
#             }
#         )

#     async def broadcast_event(self, event):
#         """Handle broadcast from channel layer"""
#         await self.send(text_data=json.dumps(event["event"]))

#     # Database operations - Cards
#     @database_sync_to_async
#     def create_card(self, payload):
#         try:
#             column = Column.objects.get(id=payload["column_id"])
#         except KeyError:
#             raise ValueError("Missing required field: column_id")
#         except ObjectDoesNotExist:
#             raise ValueError(f"Column with id {payload['column_id']} does not exist")
        
#         try:
#             title = payload["title"]
#         except KeyError:
#             raise ValueError("Missing required field: title")
        
#         assignee = None
#         if payload.get("assignee"):
#             try:
#                 assignee = User.objects.get(id=payload["assignee"])
#             except ObjectDoesNotExist:
#                 raise ValueError(f"User with id {payload['assignee']} does not exist")
        
#         return Card.objects.create(
#             title=title,
#             description=payload.get("description", ""),
#             column=column,
#             assignee=assignee
#         )

#     @database_sync_to_async
#     def update_card(self, payload):
#         card_id = payload.get("id") or payload.get("card_id")
#         if not card_id:
#             raise ValueError("Missing card ID (use 'id' or 'card_id')")
        
#         try:
#             card = Card.objects.get(id=card_id)
#         except ObjectDoesNotExist:
#             raise ValueError(f"Card with id {card_id} does not exist")
        
#         if "title" in payload:
#             card.title = payload["title"]
        
#         if "description" in payload:
#             card.description = payload["description"]
        
#         if "column_id" in payload:
#             try:
#                 Column.objects.get(id=payload["column_id"])
#                 card.column_id = payload["column_id"]
#             except ObjectDoesNotExist:
#                 raise ValueError(f"Column with id {payload['column_id']} does not exist")
        
#         if "assignee" in payload:
#             if payload["assignee"] is None:
#                 card.assignee = None
#             else:
#                 try:
#                     assignee = User.objects.get(id=payload["assignee"])
#                     card.assignee = assignee
#                 except ObjectDoesNotExist:
#                     raise ValueError(f"User with id {payload['assignee']} does not exist")
        
#         card.save()
#         return card

#     @database_sync_to_async
#     def delete_card(self, card_id):
#         try:
#             card = Card.objects.get(id=card_id)
#             card.delete()
#         except ObjectDoesNotExist:
#             raise ValueError(f"Card with id {card_id} does not exist")

#     # Database operations - Columns
#     @database_sync_to_async
#     def create_column(self, payload):
#         try:
#             board = Board.objects.get(id=self.board_id)
#         except ObjectDoesNotExist:
#             raise ValueError(f"Board with id {self.board_id} does not exist")
        
#         try:
#             title = payload["title"]
#         except KeyError:
#             raise ValueError("Missing required field: title")
        
#         return Column.objects.create(
#             title=title,
#             board=board,
#             position=payload.get("position", 0)
#         )

#     @database_sync_to_async
#     def update_column(self, payload):
#         column_id = payload.get("id") or payload.get("column_id")
#         if not column_id:
#             raise ValueError("Missing column ID (use 'id' or 'column_id')")
        
#         try:
#             column = Column.objects.get(id=column_id)
#         except ObjectDoesNotExist:
#             raise ValueError(f"Column with id {column_id} does not exist")
        
#         if "title" in payload:
#             column.title = payload["title"]
        
#         if "position" in payload:
#             column.position = payload["position"]
        
#         column.save()
#         return column

#     @database_sync_to_async
#     def delete_column(self, column_id):
#         try:
#             column = Column.objects.get(id=column_id)
#             # Note: This will also delete all cards in the column due to CASCADE
#             column.delete()
#         except ObjectDoesNotExist:
#             raise ValueError(f"Column with id {column_id} does not exist")

#     # Database operations - Board
#     @database_sync_to_async
#     def update_board(self, payload):
#         try:
#             board = Board.objects.get(id=self.board_id)
#         except ObjectDoesNotExist:
#             raise ValueError(f"Board with id {self.board_id} does not exist")
        
#         if "title" in payload:
#             board.title = payload["title"]
        
#         if "description" in payload:
#             board.description = payload["description"]
        
#         board.save()
#         return board