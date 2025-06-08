import json
from channels.generic.websocket import AsyncWebsocketConsumer

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
        data = json.loads(text_data)
        event_type = data.get("type")

        # Debugging log
        print(f"Received event: {data}")

        if event_type and event_type.startswith(("card.", "column.")):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_event",
                    "event": data
                }
            )

    async def broadcast_event(self, event):
        await self.send(text_data=json.dumps(event["event"]))

# import json
# from channels.generic.websocket import AsyncWebsocketConsumer

# class BoardConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         self.board_id = self.scope["url_route"]["kwargs"]["board_id"]
#         self.room_group_name = f"board_{self.board_id}"

#         # Join board group
#         await self.channel_layer.group_add(
#             self.room_group_name,
#             self.channel_name
#         )

#         await self.accept()

#     async def disconnect(self, close_code):
#         # Leave board group
#         await self.channel_layer.group_discard(
#             self.room_group_name,
#             self.channel_name
#         )

#     # Receive message from WebSocket
#     async def receive(self, text_data):
#         data = json.loads(text_data)
#         message = data["message"]

#         # Broadcast to group
#         await self.channel_layer.group_send(
#             self.room_group_name,
#             {
#                 "type": "board_message",
#                 "message": message
#             }
#         )

#     # Receive message from group
#     async def board_message(self, event):
#         await self.send(text_data=json.dumps({
#             "message": event["message"]
#         }))



