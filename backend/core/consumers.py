import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Card, Column
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist

User = get_user_model()
logger = logging.getLogger(__name__)


class BoardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.board_id = self.scope['url_route']['kwargs']['board_id']
        self.room_group_name = f"board_{self.board_id}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

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
            
            if event_type == "card.created":
                try:
                    card = await self.create_card(payload)
                    response = {
                        "type": "card.created",
                        "payload": {
                            "id": card.id,
                            "title": card.title,
                            "column_id": card.column_id,
                            "assignee": card.assignee_id
                        }
                    }
                except Exception as e:
                    await self.send_error(f"Failed to create card: {str(e)}")
                    return
                    
            elif event_type == "card.updated":
                try:
                    card = await self.update_card(payload)
                    response = {
                        "type": "card.updated",
                        "payload": {
                            "id": card.id,
                            "title": card.title,
                            "column_id": card.column_id,
                            "assignee": card.assignee_id
                        }
                    }
                except Exception as e:
                    await self.send_error(f"Failed to update card: {str(e)}")
                    return
                    
            elif event_type == "card.deleted":
                try:
                    card_id = payload.get("id") or payload.get("card_id")
                    if not card_id:
                        await self.send_error("Missing card ID for deletion")
                        return
                    
                    await self.delete_card(card_id)
                    response = {
                        "type": "card.deleted",
                        "payload": {
                            "id": card_id
                        }
                    }
                except Exception as e:
                    await self.send_error(f"Failed to delete card: {str(e)}")
                    return
            else:
                await self.send_error(f"Unknown event type: {event_type}")
                return
            
            # Broadcast to all in the board
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_event",
                    "event": response
                }
            )
            
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON format")
        except Exception as e:
            logger.error(f"Unexpected error in WebSocket consumer: {str(e)}")
            await self.send_error("An unexpected error occurred")

    async def send_error(self, error_message):
        """Send error message to client"""
        await self.send(text_data=json.dumps({
            "type": "error",
            "payload": {
                "message": error_message
            }
        }))

    async def broadcast_event(self, event):
        await self.send(text_data=json.dumps(event["event"]))

    # Utility methods
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
            column=column,
            assignee=assignee
        )

    @database_sync_to_async
    def update_card(self, payload):
        # Handle both 'id' and 'card_id' for backward compatibility
        card_id = payload.get("id") or payload.get("card_id")
        if not card_id:
            raise ValueError("Missing card ID (use 'id' or 'card_id')")
        
        try:
            card = Card.objects.get(id=card_id)
        except ObjectDoesNotExist:
            raise ValueError(f"Card with id {card_id} does not exist")
        
        # Update fields if provided
        if "title" in payload:
            card.title = payload["title"]
        
        if "column_id" in payload:
            try:
                Column.objects.get(id=payload["column_id"])  # Validate column exists
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
# import json
# from channels.generic.websocket import AsyncWebsocketConsumer
# from channels.db import database_sync_to_async
# from .models import Card, Column
# from django.contrib.auth import get_user_model

# User = get_user_model()


# class BoardConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         self.board_id = self.scope['url_route']['kwargs']['board_id']
#         self.room_group_name = f"board_{self.board_id}"

#         await self.channel_layer.group_add(
#             self.room_group_name,
#             self.channel_name
#         )

#         await self.accept()

#     async def disconnect(self, close_code):
#         await self.channel_layer.group_discard(
#             self.room_group_name,
#             self.channel_name
#         )

#     async def receive(self, text_data):
#         data = json.loads(text_data)
#         event_type = data.get("type")
#         payload = data.get("payload")
        
#         if event_type == "card.created":
#             card = await self.create_card(payload)
#             response = {
#                 "type": "card.created",
#                 "payload": {
#                     "id": card.id,
#                     "title": card.title,
#                     "column_id": card.column_id,
#                     "assignee": card.assignee_id
#                 }
#             }
#         elif event_type == "card.updated":
#             card = await self.update_card(payload)
#             response = {
#                 "type": "card.updated",
#                 "payload": {
#                     "id": card.id,
#                     "title": card.title,
#                     "column_id": card.column_id,
#                     "assignee": card.assignee_id
#                 }
#             }
#         elif event_type == "card.deleted":
#             await self.delete_card(payload["id"])
#             response = {
#                 "type": "card.deleted",
#                 "payload": {
#                     "id": payload["id"]
#                 }
#             }
#         else:
#             return
        
#         # Broadcast to all in the board
#         await self.channel_layer.group_send(
#             self.room_group_name,
#             {
#                 "type": "broadcast_event",
#                 "event": response
#             }
#         )

#     async def broadcast_event(self, event):
#         await self.send(text_data=json.dumps(event["event"]))

#     # Utility methods
#     @database_sync_to_async
#     def create_card(self, payload):
#         column = Column.objects.get(id=payload["column_id"])
#         assignee = User.objects.get(id=payload["assignee"]) if payload.get("assignee") else None
#         return Card.objects.create(
#             title=payload["title"],
#             column=column,
#             assignee=assignee
#         )

#     @database_sync_to_async
#     def update_card(self, payload):
#         card = Card.objects.get(id=payload["id"])
#         card.title = payload.get("title", card.title)
#         if "column_id" in payload:
#             card.column_id = payload["column_id"]
#         if "assignee" in payload:
#             card.assignee_id = payload["assignee"]
#         card.save()
#         return card

#     @database_sync_to_async
#     def delete_card(self, card_id):
#         Card.objects.filter(id=card_id).delete()
