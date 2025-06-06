from channels.generic.websocket import AsyncWebsocketConsumer
import json

class BoardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.board_id = self.scope['url_route']['kwargs']['board_id']
        self.board_group_name = f'board_{self.board_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.board_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.board_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']

        # Broadcast to group
        await self.channel_layer.group_send(
            self.board_group_name,
            {
                'type': 'chat_message',
                'message': message
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message']
        }))

# import json
# from channels.generic.websocket import AsyncWebsocketConsumer

# class BoardConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         self.board_id = self.scope['url_route']['kwargs']['board_id']
#         self.group_name = f'board_{self.board_id}'

#         await self.channel_layer.group_add(self.group_name, self.channel_name)
#         await self.accept()

#     async def disconnect(self, close_code):
#         await self.channel_layer.group_discard(self.group_name, self.channel_name)

#     async def receive(self, text_data):
#         data = json.loads(text_data)
#         await self.channel_layer.group_send(
#             self.group_name,
#             {
#                 'type': 'broadcast_message',
#                 'message': data['message']
#             }
#         )

#     async def broadcast_message(self, event):
#         await self.send(text_data=json.dumps({
#             'message': event['message']
#         }))
