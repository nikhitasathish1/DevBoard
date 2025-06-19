// src/websocket/socketManager.js

let socket = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectInterval = 3000; // 3 seconds

export const connectSocket = (boardId, token, onMessage) => {
  // Close existing connection if any
  if (socket && socket.readyState !== WebSocket.CLOSED) {
    socket.close();
  }

  if (!boardId || !token) {
    console.error('Board ID and token are required for WebSocket connection');
    return null;
  }

  // Use the correct WebSocket URL format based on your Django routing
  const wsUrl = `ws://localhost:8000/ws/board/${boardId}/?token=${token}`;
  console.log('Connecting to WebSocket:', wsUrl);
  
  try {
    socket = new WebSocket(wsUrl);
    
    socket.onopen = (event) => {
      console.log('WebSocket connection opened for board:', boardId);
      reconnectAttempts = 0; // Reset reconnect attempts on successful connection
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        // Handle different message types
        if (data.type === 'error') {
          console.error('WebSocket error message:', data.message);
        } else if (onMessage && typeof onMessage === 'function') {
          onMessage(data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error, event.data);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      socket = null;
      
      // Attempt to reconnect if the connection was closed unexpectedly
      if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
        console.log(`Attempting to reconnect... (${reconnectAttempts + 1}/${maxReconnectAttempts})`);
        setTimeout(() => {
          reconnectAttempts++;
          connectSocket(boardId, token, onMessage);
        }, reconnectInterval);
      }
    };
    
    return socket;
  } catch (error) {
    console.error('Error creating WebSocket connection:', error);
    return null;
  }
};

export const sendMessage = (message) => {
  if (!socket) {
    console.error('WebSocket is not initialized');
    return false;
  }
  
  if (socket.readyState !== WebSocket.OPEN) {
    console.error('WebSocket is not connected. ReadyState:', socket.readyState);
    return false;
  }
  
  try {
    console.log('Sending WebSocket message:', message);
    socket.send(JSON.stringify(message));
    return true;
  } catch (error) {
    console.error('Error sending WebSocket message:', error);
    return false;
  }
};

export const closeSocket = () => {
  if (socket) {
    console.log('Closing WebSocket connection...');
    socket.close(1000, 'Connection closed by client');
    socket = null;
  }
};

export const getConnectionState = () => {
  if (!socket) return 'DISCONNECTED';
  
  switch (socket.readyState) {
    case WebSocket.CONNECTING:
      return 'CONNECTING';
    case WebSocket.OPEN:
      return 'OPEN';
    case WebSocket.CLOSING:
      return 'CLOSING';
    case WebSocket.CLOSED:
      return 'CLOSED';
    default:
      return 'UNKNOWN';
  }
};

export const isSocketReady = () => {
  return socket && socket.readyState === WebSocket.OPEN;
};


// // src/websocket/socketManager.js

// let socket = null;

// export const connectSocket = (boardId, token, onMessage) => {
//   // Close existing connection if any
//   if (socket) {
//     socket.close();
//   }

//   const wsUrl = `ws://localhost:8000/ws/board/${boardId}/?token=${token}`;
//   console.log('Connecting to WebSocket:', wsUrl);
  
//   socket = new WebSocket(wsUrl);
  
//   socket.onmessage = (event) => {
//     try {
//       const data = JSON.parse(event.data);
//       console.log('WebSocket message received:', data);
//       onMessage(data);
//     } catch (error) {
//       console.error('Error parsing WebSocket message:', error);
//     }
//   };
  
//   socket.onerror = (error) => {
//     console.error('WebSocket error:', error);
//   };
  
//   socket.onclose = (event) => {
//     console.log('WebSocket connection closed:', event.code, event.reason);
//   };
  
//   return socket;
// };

// export const sendMessage = (socket, message) => {
//   if (socket && socket.readyState === WebSocket.OPEN) {
//     console.log('Sending WebSocket message:', message);
//     socket.send(JSON.stringify(message));
//   } else {
//     console.error('WebSocket is not connected');
//   }
// };

// export const closeSocket = (socket) => {
//   if (socket) {
//     socket.close();
//   }
// };
