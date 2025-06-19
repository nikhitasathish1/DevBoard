// src/websocket/socketManager.js

let socket = null;

export const connectSocket = (boardId, token, onMessage) => {
  // Close existing connection if any
  if (socket) {
    socket.close();
  }

  const wsUrl = `ws://localhost:8000/ws/board/${boardId}/?token=${token}`;
  console.log('Connecting to WebSocket:', wsUrl);
  
  socket = new WebSocket(wsUrl);
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data);
      onMessage(data);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };
  
  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  socket.onclose = (event) => {
    console.log('WebSocket connection closed:', event.code, event.reason);
  };
  
  return socket;
};

export const sendMessage = (socket, message) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log('Sending WebSocket message:', message);
    socket.send(JSON.stringify(message));
  } else {
    console.error('WebSocket is not connected');
  }
};

export const closeSocket = (socket) => {
  if (socket) {
    socket.close();
  }
};

// // websocket/socketManager.js

// let socket = null;

// export function connectSocket(boardId, token, onMessage) {
//   // Close existing socket if any
//   if (socket && socket.readyState !== WebSocket.CLOSED) {
//     socket.close();
//   }

//   // Validate inputs
//   if (!boardId) {
//     console.error('Board ID is required for WebSocket connection');
//     return null;
//   }

//   if (!token) {
//     console.error('Authentication token is required for WebSocket connection');
//     return null;
//   }

//   try {
//     // Create WebSocket connection
//     const wsUrl = `ws://localhost:8000/ws/boards/${boardId}/?token=${token}`;
//     console.log('Connecting to WebSocket:', wsUrl);
    
//     const ws = new WebSocket(wsUrl);
    
//     // Set up event handlers
//     ws.onopen = (event) => {
//       console.log('WebSocket connection opened for board:', boardId);
//       socket = ws;
//     };

//     ws.onmessage = (event) => {
//       try {
//         const data = JSON.parse(event.data);
//         console.log('WebSocket message received:', data);
//         if (onMessage && typeof onMessage === 'function') {
//           onMessage(data);
//         }
//       } catch (error) {
//         console.error('Error parsing WebSocket message:', error, event.data);
//       }
//     };

//     ws.onclose = (event) => {
//       console.log('WebSocket connection closed:', event.code, event.reason);
//       if (event.code !== 1000) {
//         console.warn('WebSocket closed unexpectedly. Code:', event.code, 'Reason:', event.reason);
//       }
//       socket = null;
//     };

//     ws.onerror = (error) => {
//       console.error('WebSocket error:', error);
//     };

//     return ws;
//   } catch (error) {
//     console.error('Error creating WebSocket connection:', error);
//     return null;
//   }
// }

// export function sendMessage(ws, data) {
//   if (!ws) {
//     console.error('WebSocket instance is null');
//     return false;
//   }

//   if (ws.readyState !== WebSocket.OPEN) {
//     console.error('WebSocket is not open. ReadyState:', ws.readyState);
//     return false;
//   }

//   if (!data) {
//     console.error('No data provided to send');
//     return false;
//   }

//   try {
//     const message = JSON.stringify(data);
//     console.log('Sending WebSocket message:', message);
//     ws.send(message);
//     return true;
//   } catch (error) {
//     console.error('Error sending WebSocket message:', error);
//     return false;
//   }
// }

// export function closeSocket(ws) {
//   if (!ws) {
//     console.warn('No WebSocket instance to close');
//     return;
//   }

//   try {
//     if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
//       console.log('Closing WebSocket connection...');
//       ws.close(1000, 'Component unmounting');
//     }
//   } catch (error) {
//     console.error('Error closing WebSocket:', error);
//   }

//   // Clear the global socket reference if it matches
//   if (socket === ws) {
//     socket = null;
//   }
// }

// export function getConnectionState(ws) {
//   if (!ws) return 'DISCONNECTED';
  
//   switch (ws.readyState) {
//     case WebSocket.CONNECTING:
//       return 'CONNECTING';
//     case WebSocket.OPEN:
//       return 'OPEN';
//     case WebSocket.CLOSING:
//       return 'CLOSING';
//     case WebSocket.CLOSED:
//       return 'CLOSED';
//     default:
//       return 'UNKNOWN';
//   }
// }

// // Utility function to check if WebSocket is ready for sending messages
// export function isSocketReady(ws) {
//   return ws && ws.readyState === WebSocket.OPEN;
// }