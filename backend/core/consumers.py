import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Card, Column, Board
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist

User = get_user_model()
logger = logging.getLogger(__name__)


class BoardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Get user from middleware (already authenticated)
        self.user = self.scope.get("user")
        
        # Check if user is authenticated
        if not self.user or self.user.is_anonymous:
            logger.warning("Unauthenticated WebSocket connection attempt")
            await self.close(code=4001)  # Custom close code for auth failure
            return
        
        # Get board ID from URL
        self.board_id = self.scope['url_route']['kwargs']['board_id']
        self.room_group_name = f"board_{self.board_id}"
        
        # Check if user has access to this board
        has_access = await self.check_board_access(self.board_id, self.user)
        if not has_access:
            logger.warning(f"User {self.user.id} denied access to board {self.board_id}")
            await self.close(code=4003)  # Custom close code for access denied
            return

        # Join the board group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # Accept the WebSocket connection
        await self.accept()
        
        # Send welcome message with user info
        await self.send(text_data=json.dumps({
            "type": "connection.established",
            "payload": {
                "user_id": self.user.id,
                "username": self.user.username,
                "board_id": self.board_id,
                "message": f"Connected to board {self.board_id}"
            }
        }))
        
        logger.info(f"User {self.user.username} connected to board {self.board_id}")

    async def disconnect(self, close_code):
        # Leave the board group
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        
        if hasattr(self, 'user') and self.user and not self.user.is_anonymous:
            logger.info(f"User {self.user.username} disconnected from board {getattr(self, 'board_id', 'unknown')}")

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
            
            else:
                await self.send_error(f"Unknown event type: {event_type}")
                return
            
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON format")
        except Exception as e:
            logger.error(f"Unexpected error in WebSocket consumer: {str(e)}")
            await self.send_error("An unexpected error occurred")

    @database_sync_to_async
    def check_board_access(self, board_id, user):
        """Check if user has access to this board"""
        try:
            # You can customize this logic based on your board permissions
            board = Board.objects.get(id=board_id)
            # For now, allow access to all authenticated users
            # You can add more sophisticated permission checks here
            # For example:
            # - Check if user is board owner
            # - Check if user is board member
            # - Check if board is public
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
                    "created_at": card.created_at.isoformat() if hasattr(card, 'created_at') else None
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
                    "updated_by": self.user.id
                }
            }
            await self.broadcast_event(response)
        except Exception as e:
            await self.send_error(f"Failed to update card: {str(e)}")

    async def handle_card_deleted(self, payload):
        try:
            card_id = payload.get("id") or payload.get("card_id")
            if not card_id:
                await self.send_error("Missing card ID for deletion")
                return
            
            await self.delete_card(card_id)
            response = {
                "type": "card.deleted",
                "payload": {
                    "id": card_id,
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

    # Utility methods
    async def send_error(self, error_message):
        """Send error message to client"""
        await self.send(text_data=json.dumps({
            "type": "error",
            "payload": {
                "message": error_message,
                "timestamp": json.dumps({"$date": {"$numberLong": str(int(__import__('time').time() * 1000))}})
            }
        }))

    async def broadcast_event(self, event):
        """Broadcast event to all connected clients in the board"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "send_event_to_group",
                "event": event
            }
        )

    async def send_event_to_group(self, event):
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
            assignee=assignee
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
        
        card.save()
        return card

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


