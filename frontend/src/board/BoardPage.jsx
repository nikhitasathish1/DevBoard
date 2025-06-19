
// src/board/BoardPage.jsx - Example of how to update your component
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function BoardPage() {
  const [board, setBoard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout, apiClient } = useAuth();

  useEffect(() => {
    fetchBoardData();
  }, [id]);

  const fetchBoardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch board details
      const boardResponse = await apiClient.get(`/projects/${id}/`);
      setBoard(boardResponse.data);
      
      // Fetch tasks for this board
      const tasksResponse = await apiClient.get(`/projects/${id}/tasks/`);
      setTasks(tasksResponse.data);
    } catch (error) {
      console.error('Error fetching board data:', error);
      if (error.response?.status === 404) {
        setError('Board not found');
      } else {
        setError('Failed to fetch board data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const goBack = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Loading board...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ 
          color: '#dc3545', 
          backgroundColor: '#f8d7da', 
          padding: '15px', 
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
        <button 
          onClick={goBack}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={goBack}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ← Back
          </button>
          <h1 style={{ margin: 0 }}>
            {board?.name || 'Board'}
          </h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {user && (
            <span style={{ color: '#666' }}>
              {user.username || user.first_name || 'User'}
            </span>
          )}
          <button 
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {board?.description && (
        <p style={{ color: '#666', marginBottom: '20px' }}>
          {board.description}
        </p>
      )}

      <div style={{ display: 'grid', gap: '15px' }}>
        <h2>Tasks</h2>
        {tasks.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>
            No tasks found. Create your first task!
          </p>
        ) : (
          tasks.map(task => (
            <div 
              key={task.id}
              style={{
                padding: '15px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                backgroundColor: 'white'
              }}
            >
              <h3 style={{ margin: '0 0 10px 0' }}>{task.title}</h3>
              <p style={{ margin: '0 0 10px 0', color: '#666' }}>
                {task.description || 'No description'}
              </p>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ 
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  backgroundColor: task.status === 'completed' ? '#d4edda' : '#fff3cd',
                  color: task.status === 'completed' ? '#155724' : '#856404'
                }}>
                  {task.status || 'pending'}
                </span>
                {task.due_date && (
                  <span style={{ fontSize: '14px', color: '#666' }}>
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default BoardPage;// import React, { useState, useEffect, useRef } from 'react';

// // Configuration - Update these URLs to match your backend
// const API_BASE = 'http://localhost:8000/api';
// const WS_BASE = 'ws://localhost:8000/ws';

// // In-memory auth token storage (replaces localStorage)
// let authToken = null;

// // Mock authentication for demo - replace with real auth
// const setAuthToken = (token) => {
//   authToken = token;
// };

// const getAuthToken = () => {
//   return authToken || 'demo-token-123'; // Default demo token
// };

// const clearAuthToken = () => {
//   authToken = null;
// };

// class ApiService {
//   static async request(endpoint, options = {}) {
//     const token = getAuthToken();
//     const config = {
//       headers: {
//         'Content-Type': 'application/json',
//         ...(token && { 'Authorization': `Bearer ${token}` }),
//         ...options.headers
//       },
//       ...options
//     };

//     try {
//       const response = await fetch(`${API_BASE}${endpoint}`, config);
      
//       if (!response.ok) {
//         if (response.status === 401) {
//           clearAuthToken();
//           throw new Error('Authentication failed - please login again');
//         }
//         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
//       }
      
//       return await response.json();
//     } catch (error) {
//       console.error('API Error:', error);
//       throw error;
//     }
//   }

//   static async get(endpoint) {
//     return this.request(endpoint);
//   }

//   static async post(endpoint, data) {
//     return this.request(endpoint, {
//       method: 'POST',
//       body: JSON.stringify(data)
//     });
//   }

//   static async put(endpoint, data) {
//     return this.request(endpoint, {
//       method: 'PUT',
//       body: JSON.stringify(data)
//     });
//   }

//   static async delete(endpoint) {
//     return this.request(endpoint, {
//       method: 'DELETE'
//     });
//   }
// }

// // WebSocket hook for real-time updates
// function useWebSocket(boardId, onMessage) {
//   const ws = useRef(null);
//   const [connectionStatus, setConnectionStatus] = useState('Disconnected');
//   const reconnectTimeoutRef = useRef(null);
//   const reconnectAttemptsRef = useRef(0);
//   const maxReconnectAttempts = 5;

//   const connect = () => {
//     const token = getAuthToken();
//     if (!token || !boardId) {
//       setConnectionStatus('No Auth Token');
//       return;
//     }

//     try {
//       const wsUrl = `${WS_BASE}/board/${boardId}/?token=${encodeURIComponent(token)}`;
//       console.log('Connecting to WebSocket:', wsUrl);
      
//       ws.current = new WebSocket(wsUrl);

//       ws.current.onopen = () => {
//         setConnectionStatus('Connected');
//         reconnectAttemptsRef.current = 0;
//         console.log('WebSocket connected successfully');
//       };

//       ws.current.onmessage = (event) => {
//         try {
//           const data = JSON.parse(event.data);
//           console.log('WebSocket message received:', data);
//           onMessage(data);
//         } catch (error) {
//           console.error('Error parsing WebSocket message:', error);
//         }
//       };

//       ws.current.onclose = (event) => {
//         setConnectionStatus('Disconnected');
//         console.log('WebSocket disconnected:', event.code, event.reason);
        
//         // Attempt to reconnect if not manually closed
//         if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
//           const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
//           reconnectAttemptsRef.current += 1;
          
//           setConnectionStatus(`Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
//           reconnectTimeoutRef.current = setTimeout(() => {
//             connect();
//           }, delay);
//         }
//       };

//       ws.current.onerror = (error) => {
//         setConnectionStatus('Error');
//         console.error('WebSocket error:', error);
//       };

//     } catch (error) {
//       setConnectionStatus('Connection Failed');
//       console.error('Failed to create WebSocket connection:', error);
//     }
//   };

//   useEffect(() => {
//     connect();

//     return () => {
//       if (reconnectTimeoutRef.current) {
//         clearTimeout(reconnectTimeoutRef.current);
//       }
//       if (ws.current) {
//         ws.current.close(1000, 'Component unmounting');
//       }
//     };
//   }, [boardId]);

//   const sendMessage = (message) => {
//     if (ws.current?.readyState === WebSocket.OPEN) {
//       try {
//         ws.current.send(JSON.stringify(message));
//         console.log('WebSocket message sent:', message);
//       } catch (error) {
//         console.error('Error sending WebSocket message:', error);
//       }
//     } else {
//       console.warn('WebSocket not connected, cannot send message:', message);
//     }
//   };

//   const reconnect = () => {
//     if (ws.current) {
//       ws.current.close();
//     }
//     reconnectAttemptsRef.current = 0;
//     connect();
//   };

//   return { sendMessage, connectionStatus, reconnect };
// }

// function KanbanBoard({ boardId = 1, projectId = 1 }) {
//   // Board state
//   const [columns, setColumns] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
  
//   const [projectName, setProjectName] = useState('Loading...');
//   const [projectDescription, setProjectDescription] = useState('');
//   const [teamName, setTeamName] = useState('');
//   const [teamMembers, setTeamMembers] = useState([]);

//   // Form states for operations
//   const [activeOperation, setActiveOperation] = useState(null);
//   const [formData, setFormData] = useState({
//     cardTitle: '',
//     cardDescription: '',
//     columnId: 1,
//     assignee: '',
//     cardId: '',
//     columnTitle: '',
//     columnIdToUpdate: '',
//     position: 0,
//     boardTitle: '',
//     boardDescription: ''
//   });

//   // Handle WebSocket messages
//   const handleWebSocketMessage = (data) => {
//     console.log('Processing WebSocket message:', data);
    
//     switch (data.type) {
//       case 'card.created':
//         setColumns(prev => prev.map(col => 
//           col.id === data.card.column_id 
//             ? { ...col, cards: [...(col.cards || []), data.card] }
//             : col
//         ));
//         break;
        
//       case 'card.updated':
//         setColumns(prev => prev.map(col => ({
//           ...col,
//           cards: (col.cards || []).map(card => 
//             card.id === data.card.id ? { ...card, ...data.card } : card
//           )
//         })));
//         break;
        
//       case 'card.deleted':
//         setColumns(prev => prev.map(col => ({
//           ...col,
//           cards: (col.cards || []).filter(card => card.id !== data.card_id)
//         })));
//         break;
        
//       case 'card.moved':
//         setColumns(prev => {
//           let cardToMove = null;
//           const newColumns = prev.map(col => ({
//             ...col,
//             cards: (col.cards || []).filter(card => {
//               if (card.id === data.card_id) {
//                 cardToMove = { ...card, column_id: data.new_column_id };
//                 return false;
//               }
//               return true;
//             })
//           }));

//           if (cardToMove) {
//             return newColumns.map(col => 
//               col.id === data.new_column_id
//                 ? { ...col, cards: [...(col.cards || []), cardToMove] }
//                 : col
//             );
//           }
//           return newColumns;
//         });
//         break;
        
//       case 'card.assigned':
//         setColumns(prev => prev.map(col => ({
//           ...col,
//           cards: (col.cards || []).map(card => 
//             card.id === data.card_id 
//               ? { ...card, assignee: data.assignee }
//               : card
//           )
//         })));
//         break;
        
//       case 'column.created':
//         setColumns(prev => [...prev, { ...data.column, cards: [] }]);
//         break;
        
//       case 'column.updated':
//         setColumns(prev => prev.map(col => 
//           col.id === data.column.id ? { ...col, ...data.column } : col
//         ));
//         break;
        
//       case 'column.deleted':
//         setColumns(prev => prev.filter(col => col.id !== data.column_id));
//         break;
        
//       case 'error':
//         console.error('WebSocket error message:', data.message);
//         setError(data.message);
//         break;
        
//       default:
//         console.log('Unknown WebSocket message type:', data.type);
//     }
//   };

//   const { sendMessage, connectionStatus, reconnect } = useWebSocket(boardId, handleWebSocketMessage);

//   // Load initial data
//   useEffect(() => {
//     loadBoardData();
//   }, [boardId, projectId]);

//   const loadBoardData = async () => {
//     try {
//       setLoading(true);
//       setError(null);
      
//       console.log('Loading board data...');
      
//       // Try to load real data from API
//       try {
//         const [boardData, projectData] = await Promise.all([
//           ApiService.get(`/boards/${boardId}/`),
//           ApiService.get(`/projects/${projectId}/`)
//         ]);
        
//         setProjectName(projectData.name || 'Unnamed Project');
//         setProjectDescription(projectData.description || '');
//         setTeamName(projectData.team_name || 'Unknown Team');
//         setTeamMembers(projectData.team_members || []);
        
//         // Load columns and cards
//         const columnsData = await ApiService.get(`/boards/${boardId}/columns/`);
//         setColumns(columnsData.map(col => ({ ...col, cards: col.cards || [] })));
        
//         console.log('Board data loaded successfully');
        
//       } catch (apiError) {
//         console.warn('API unavailable, using demo data:', apiError.message);
//         setError('API Connection Failed - Using Demo Data');
        
//         // Fallback to demo data
//         setColumns([
//           { 
//             id: 1, 
//             name: 'To Do', 
//             cards: [
//               { id: 1, title: 'Sample Task 1', description: 'This is a demo task', assignee: 'John Doe', column_id: 1 },
//               { id: 2, title: 'Sample Task 2', description: 'Another demo task', assignee: 'Jane Smith', column_id: 1 }
//             ], 
//             position: 0 
//           },
//           { 
//             id: 2, 
//             name: 'In Progress', 
//             cards: [
//               { id: 3, title: 'Active Task', description: 'Currently being worked on', assignee: 'John Doe', column_id: 2 }
//             ], 
//             position: 1 
//           },
//           { 
//             id: 3, 
//             name: 'Done', 
//             cards: [
//               { id: 4, title: 'Completed Task', description: 'This task is finished', assignee: 'Jane Smith', column_id: 3 }
//             ], 
//             position: 2 
//           }
//         ]);
//         setProjectName('Demo Kanban Project');
//         setProjectDescription('Demo board with sample data');
//         setTeamName('Demo Team');
//         setTeamMembers(['John Doe', 'Jane Smith', 'Bob Johnson']);
//       }
      
//     } catch (err) {
//       setError('Failed to load board: ' + err.message);
//       console.error('Failed to load board data:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Card Operations
//   const createCard = async () => {
//     if (!formData.cardTitle.trim()) {
//       alert('Please enter a card title');
//       return;
//     }
    
//     const cardData = {
//       title: formData.cardTitle.trim(),
//       description: formData.cardDescription.trim(),
//       column_id: parseInt(formData.columnId),
//       assignee: formData.assignee || 'Unassigned',
//       board_id: boardId
//     };
    
//     try {
//       const newCard = await ApiService.post('/cards/', cardData);
      
//       // Update local state immediately
//       const cardWithId = { ...cardData, id: newCard.id || Date.now() };
//       setColumns(prev => prev.map(col => 
//         col.id === cardData.column_id 
//           ? { ...col, cards: [...(col.cards || []), cardWithId] }
//           : col
//       ));
      
//       // Send WebSocket message
//       sendMessage({
//         type: 'card.created',
//         card: cardWithId
//       });
      
//       // Reset form
//       setFormData(prev => ({ 
//         ...prev, 
//         cardTitle: '', 
//         cardDescription: '', 
//         assignee: '' 
//       }));
//       setActiveOperation(null);
      
//       alert('Card created successfully!');
//     } catch (error) {
//       // Fallback: add card locally if API fails
//       const localCard = { ...cardData, id: Date.now() };
//       setColumns(prev => prev.map(col => 
//         col.id === cardData.column_id 
//           ? { ...col, cards: [...(col.cards || []), localCard] }
//           : col
//       ));
      
//       setFormData(prev => ({ 
//         ...prev, 
//         cardTitle: '', 
//         cardDescription: '', 
//         assignee: '' 
//       }));
//       setActiveOperation(null);
      
//       alert('Card created locally (API unavailable)');
//     }
//   };

//   const updateCard = async () => {
//     if (!formData.cardId || !formData.cardTitle.trim()) {
//       alert('Please enter both Card ID and Title');
//       return;
//     }
    
//     const cardData = {
//       title: formData.cardTitle.trim(),
//       description: formData.cardDescription.trim(),
//       assignee: formData.assignee
//     };
    
//     try {
//       const updatedCard = await ApiService.put(`/cards/${formData.cardId}/`, cardData);
      
//       // Update local state
//       setColumns(prev => prev.map(col => ({
//         ...col,
//         cards: (col.cards || []).map(card => 
//           card.id === parseInt(formData.cardId)
//             ? { ...card, ...cardData }
//             : card
//         )
//       })));
      
//       // Send WebSocket message
//       sendMessage({
//         type: 'card.updated',
//         card: { id: parseInt(formData.cardId), ...cardData }
//       });
      
//       setFormData(prev => ({ 
//         ...prev, 
//         cardTitle: '', 
//         cardDescription: '', 
//         assignee: '',
//         cardId: ''
//       }));
//       setActiveOperation(null);
      
//       alert('Card updated successfully!');
//     } catch (error) {
//       alert('Error updating card: ' + error.message);
//     }
//   };

//   const deleteCard = async (cardId, columnId) => {
//     const idToDelete = cardId || parseInt(formData.cardId);
    
//     if (!idToDelete) {
//       alert('Please provide a card ID');
//       return;
//     }
    
//     try {
//       await ApiService.delete(`/cards/${idToDelete}/`);
      
//       // Update local state
//       setColumns(prev => prev.map(col => ({
//         ...col,
//         cards: (col.cards || []).filter(card => card.id !== idToDelete)
//       })));
      
//       // Send WebSocket message
//       sendMessage({
//         type: 'card.deleted',
//         card_id: idToDelete
//       });
      
//       if (!cardId) {
//         setFormData(prev => ({ ...prev, cardId: '' }));
//         setActiveOperation(null);
//       }
      
//       alert('Card deleted successfully!');
//     } catch (error) {
//       // Fallback: delete locally
//       setColumns(prev => prev.map(col => ({
//         ...col,
//         cards: (col.cards || []).filter(card => card.id !== idToDelete)
//       })));
      
//       if (!cardId) {
//         setFormData(prev => ({ ...prev, cardId: '' }));
//         setActiveOperation(null);
//       }
      
//       alert('Card deleted locally (API unavailable)');
//     }
//   };

//   const moveCard = async (cardId, fromColumnId, toColumnId) => {
//     try {
//       const moveData = {
//         old_column_id: fromColumnId,
//         new_column_id: toColumnId
//       };
      
//       await ApiService.put(`/cards/${cardId}/move/`, moveData);
      
//       // Update local state
//       setColumns(prev => {
//         let cardToMove = null;
//         const newColumns = prev.map(col => ({
//           ...col,
//           cards: (col.cards || []).filter(card => {
//             if (card.id === cardId) {
//               cardToMove = { ...card, column_id: toColumnId };
//               return false;
//             }
//             return true;
//           })
//         }));

//         if (cardToMove) {
//           return newColumns.map(col => 
//             col.id === toColumnId
//               ? { ...col, cards: [...(col.cards || []), cardToMove] }
//               : col
//           );
//         }
//         return newColumns;
//       });
      
//       // Send WebSocket message
//       sendMessage({
//         type: 'card.moved',
//         card_id: cardId,
//         old_column_id: fromColumnId,
//         new_column_id: toColumnId
//       });
      
//       alert('Card moved successfully!');
//     } catch (error) {
//       alert('Error moving card: ' + error.message);
//     }
//   };

//   const assignCard = async (cardId, assignee) => {
//     try {
//       await ApiService.put(`/cards/${cardId}/assign/`, { assignee });
      
//       // Update local state
//       setColumns(prev => prev.map(col => ({
//         ...col,
//         cards: (col.cards || []).map(card => 
//           card.id === cardId 
//             ? { ...card, assignee }
//             : card
//         )
//       })));
      
//       // Send WebSocket message
//       sendMessage({
//         type: 'card.assigned',
//         card_id: cardId,
//         assignee: assignee
//       });
      
//       alert('Card assigned successfully!');
//     } catch (error) {
//       // Fallback: assign locally
//       setColumns(prev => prev.map(col => ({
//         ...col,
//         cards: (col.cards || []).map(card => 
//           card.id === cardId 
//             ? { ...card, assignee }
//             : card
//         )
//       })));
      
//       alert('Card assigned locally (API unavailable)');
//     }
//   };

//   // Column Operations
//   const createColumn = async () => {
//     if (!formData.columnTitle.trim()) {
//       alert('Please enter a column title');
//       return;
//     }
    
//     const columnData = {
//       name: formData.columnTitle.trim(),
//       position: parseInt(formData.position) || columns.length,
//       board_id: boardId
//     };
    
//     try {
//       const newColumn = await ApiService.post('/columns/', columnData);
      
//       setColumns(prev => [...prev, { ...newColumn, cards: [] }]);
      
//       sendMessage({
//         type: 'column.created',
//         column: newColumn
//       });
      
//       setFormData(prev => ({ ...prev, columnTitle: '', position: 0 }));
//       setActiveOperation(null);
      
//       alert('Column created successfully!');
//     } catch (error) {
//       // Fallback: create column locally
//       const localColumn = { ...columnData, id: Date.now(), cards: [] };
//       setColumns(prev => [...prev, localColumn]);
      
//       setFormData(prev => ({ ...prev, columnTitle: '', position: 0 }));
//       setActiveOperation(null);
      
//       alert('Column created locally (API unavailable)');
//     }
//   };

//   const updateColumn = async () => {
//     if (!formData.columnIdToUpdate || !formData.columnTitle.trim()) {
//       alert('Please enter both Column ID and Title');
//       return;
//     }
    
//     const columnData = {
//       name: formData.columnTitle.trim(),
//       position: parseInt(formData.position) || 0
//     };
    
//     try {
//       const updatedColumn = await ApiService.put(`/columns/${formData.columnIdToUpdate}/`, columnData);
      
//       setColumns(prev => prev.map(col => 
//         col.id === parseInt(formData.columnIdToUpdate)
//           ? { ...col, ...columnData }
//           : col
//       ));
      
//       sendMessage({
//         type: 'column.updated',
//         column: { id: parseInt(formData.columnIdToUpdate), ...columnData }
//       });
      
//       setFormData(prev => ({ 
//         ...prev, 
//         columnIdToUpdate: '', 
//         columnTitle: '', 
//         position: 0 
//       }));
//       setActiveOperation(null);
      
//       alert('Column updated successfully!');
//     } catch (error) {
//       alert('Error updating column: ' + error.message);
//     }
//   };

//   const deleteColumn = async () => {
//     if (!formData.columnIdToUpdate) {
//       alert('Please enter a column ID');
//       return;
//     }
    
//     const columnId = parseInt(formData.columnIdToUpdate);
    
//     try {
//       await ApiService.delete(`/columns/${columnId}/`);
      
//       setColumns(prev => prev.filter(col => col.id !== columnId));
      
//       sendMessage({
//         type: 'column.deleted',
//         column_id: columnId
//       });
      
//       setFormData(prev => ({ ...prev, columnIdToUpdate: '' }));
//       setActiveOperation(null);
      
//       alert('Column deleted successfully!');
//     } catch (error) {
//       // Fallback: delete locally
//       setColumns(prev => prev.filter(col => col.id !== columnId));
      
//       setFormData(prev => ({ ...prev, columnIdToUpdate: '' }));
//       setActiveOperation(null);
      
//       alert('Column deleted locally (API unavailable)');
//     }
//   };

//   // Board Operations
//   const updateBoard = async () => {
//     if (!formData.boardTitle.trim()) {
//       alert('Please enter a board title');
//       return;
//     }
    
//     const boardData = {
//       name: formData.boardTitle.trim(),
//       description: formData.boardDescription.trim()
//     };
    
//     try {
//       await ApiService.put(`/projects/${projectId}/`, boardData);
      
//       setProjectName(boardData.name);
//       setProjectDescription(boardData.description);
      
//       setFormData(prev => ({ ...prev, boardTitle: '', boardDescription: '' }));
//       setActiveOperation(null);
      
//       alert('Board updated successfully!');
//     } catch (error) {
//       // Fallback: update locally
//       setProjectName(boardData.name);
//       setProjectDescription(boardData.description);
      
//       setFormData(prev => ({ ...prev, boardTitle: '', boardDescription: '' }));
//       setActiveOperation(null);
      
//       alert('Board updated locally (API unavailable)');
//     }
//   };

//   const handleInputChange = (field, value) => {
//     setFormData(prev => ({ ...prev, [field]: value }));
//   };

//   const getConnectionStatusColor = () => {
//     switch (connectionStatus) {
//       case 'Connected': return '#28a745';
//       case 'Disconnected': return '#6c757d';
//       case 'Error': return '#dc3545';
//       case 'Connection Failed': return '#dc3545';
//       case 'No Auth Token': return '#ffc107';
//       default: 
//         if (connectionStatus.includes('Reconnecting')) return '#ffc107';
//         return '#6c757d';
//     }
//   };

//   const getConnectionStatusIcon = () => {
//     switch (connectionStatus) {
//       case 'Connected': return '🟢';
//       case 'Disconnected': return '🔴';
//       case 'Error': return '🔴';
//       case 'Connection Failed': return '🔴';
//       case 'No Auth Token': return '🟡';
//       default: 
//         if (connectionStatus.includes('Reconnecting')) return '🟡';
//         return '🔴';
//     }
//   };

//   // Show loading state
//   if (loading) {
//     return (
//       <div style={{ 
//         display: 'flex', 
//         justifyContent: 'center', 
//         alignItems: 'center', 
//         height: '100vh',
//         fontFamily: 'Arial, sans-serif'
//       }}>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔄</div>
//           <h2>Loading Board...</h2>
//         </div>
//       </div>
//     );
//   }

//   const renderOperationPanel = () => {
//     if (!activeOperation) return null;

//     const panelStyle = {
//       position: 'fixed',
//       top: '50%',
//       left: '50%',
//       transform: 'translate(-50%, -50%)',
//       backgroundColor: 'white',
//       padding: '25px',
//       borderRadius: '8px',
//       boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
//       zIndex: 1000,
//       minWidth: '400px',
//       maxWidth: '90vw'
//     };

//     const overlayStyle = {
//       position: 'fixed',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       backgroundColor: 'rgba(0,0,0,0.5)',
//       zIndex: 999
//     };

//     const inputStyle = {
//       width: '100%',
//       padding: '12px',
//       marginBottom: '15px',
//       border: '1px solid #ddd',
//       borderRadius: '4px',
//       fontSize: '14px',
//       fontFamily: 'inherit',
//       boxSizing: 'border-box'
//     };

//     const textareaStyle = {
//       ...inputStyle,
//       minHeight: '80px',
//       resize: 'vertical'
//     };

//     return (
//       <>
//         <div style={overlayStyle} onClick={() => setActiveOperation(null)} />
//         <div style={panelStyle}>
//           <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>
//             {activeOperation.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
//           </h3>
          
//           {activeOperation === 'createCard' && (
//             <>
//               <input
//                 type="text"
//                 placeholder="Card Title *"
//                 value={formData.cardTitle}
//                 onChange={(e) => handleInputChange('cardTitle', e.target.value)}
//                 style={inputStyle}
//                 required
//               />
//               <textarea
//                 placeholder="Card Description"
//                 value={formData.cardDescription}
//                 onChange={(e) => handleInputChange('cardDescription', e.target.value)}
//                 style={textareaStyle}
//               />
//               <select
//                 value={formData.columnId}
//                 onChange={(e) => handleInputChange('columnId', e.target.value)}
//                 style={inputStyle}
//               >
//                 {columns.map(col => (
//                   <option key={col.id} value={col.id}>{col.name} (ID: {col.id})</option>
//                 ))}
//               </select>
//               <input
//                 type="text"
//                 placeholder="Assignee (optional)"
//                 value={formData.assignee}
//                 onChange={(e) => handleInputChange('assignee', e.target.value)}
//                 style={inputStyle}
//               />
//             </>
//           )}

//           {activeOperation === 'updateCard' && (
//             <>
//               <input
//                 type="number"
//                 placeholder="Card ID *"
//                 value={formData.cardId}
//                 onChange={(e) => handleInputChange('cardId', e.target.value)}
//                 style={inputStyle}
//                 required
//               />
//               <input
//                 type="text"
//                 placeholder="Card Title *"
//                 value={formData.cardTitle}
//                 onChange={(e) => handleInputChange('cardTitle', e.target.value)}
//                 style={inputStyle}
//                 required
//               />
//               <textarea
//                 placeholder="Card Description"
//                 value={formData.cardDescription}
//                 onChange={(e) => handleInputChange('cardDescription', e.target.value)}
//                 style={textareaStyle}
//               />
//               <input
//                 type="text"
//                 placeholder="Assignee (optional)"
//                 value={formData.assignee}
//                 onChange={(e) => handleInputChange('assignee', e.target.value)}
//                 style={inputStyle}
//               />
//             </>
//           )}

//           {activeOperation === 'deleteCard' && (
//             <input
//               type="number"
//               placeholder="Card ID *"
//               value={formData.cardId}
//               onChange={(e) => handleInputChange('cardId', e.target.value)}
//               style={inputStyle}
//               required
//             />
//           )}

//           {activeOperation === 'createColumn' && (
//             <>
//               <input
//                 type="text"
//                 placeholder="Column Title *"
//                 value={formData.columnTitle}
//                 onChange={(e) => handleInputChange('columnTitle', e.target.value)}
//                 style={inputStyle}
//                 required
//               />
//               <input
//                 type="number"
//                 placeholder="Position (0, 1, 2...)"
//                 value={formData.position}
//                 onChange={(e) => handleInputChange('position', e.target.value)}
//                 style={inputStyle}
//               />
//             </>
//           )}

//           {(activeOperation === 'updateColumn' || activeOperation === 'deleteColumn') && (
//             <>
//               <input
//                 type="number"
//                 placeholder="Column ID *"
//                 value={formData.columnIdToUpdate}
//                 onChange={(e) => handleInputChange('columnIdToUpdate', e.target.value)}
//                 style={inputStyle}
//                 required
//               />
//               {activeOperation === 'updateColumn' && (
//                 <>
//                   <input
//                     type="text"
//                     placeholder="Column Title *"
//                     value={formData.columnTitle}
//                     onChange={(e) => handleInputChange('columnTitle', e.target.value)}
//                     style={inputStyle}
//                     required
//                   />
//                   <input
//                     type="number"
//                     placeholder="Position (0, 1, 2...)"
//                     value={formData.position}
//                     onChange={(e) => handleInputChange('position', e.target.value)}
//                     style={inputStyle}
// />
//                 </>
//               )}
//             </>
//           )}

//           {activeOperation === 'updateBoard' && (
//             <>
//               <input
//                 type="text"
//                 placeholder="Board Title *"
//                 value={formData.boardTitle}
//                 onChange={(e) => handleInputChange('boardTitle', e.target.value)}
//                 style={inputStyle}
//                 required
//               />
//               <textarea
//                 placeholder="Board Description"
//                 value={formData.boardDescription}
//                 onChange={(e) => handleInputChange('boardDescription', e.target.value)}
//                 style={textareaStyle}
//               />
//             </>
//           )}

//           <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
//             <button
//               onClick={() => setActiveOperation(null)}
//               style={{
//                 padding: '12px 20px',
//                 border: '1px solid #ddd',
//                 borderRadius: '4px',
//                 backgroundColor: '#f8f9fa',
//                 cursor: 'pointer',
//                 fontSize: '14px'
//               }}
//             >
//               Cancel
//             </button>
//             <button
//               onClick={() => {
//                 switch (activeOperation) {
//                   case 'createCard': createCard(); break;
//                   case 'updateCard': updateCard(); break;
//                   case 'deleteCard': deleteCard(); break;
//                   case 'createColumn': createColumn(); break;
//                   case 'updateColumn': updateColumn(); break;
//                   case 'deleteColumn': deleteColumn(); break;
//                   case 'updateBoard': updateBoard(); break;
//                   default: console.log('Unknown operation');
//                 }
//               }}
//               style={{
//                 padding: '12px 20px',
//                 border: 'none',
//                 borderRadius: '4px',
//                 backgroundColor: '#007bff',
//                 color: 'white',
//                 cursor: 'pointer',
//                 fontSize: '14px'
//               }}
//             >
//               {activeOperation === 'deleteCard' || activeOperation === 'deleteColumn' ? 'Delete' : 'Save'}
//             </button>
//           </div>
//         </div>
//       </>
//     );
//   };

//   return (
//     <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
//       {/* Header */}
//       <div style={{ 
//         backgroundColor: 'white', 
//         padding: '20px', 
//         boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
//         borderBottom: '1px solid #e0e0e0'
//       }}>
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
//           <h1 style={{ margin: 0, color: '#333' }}>{projectName}</h1>
//           <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
//             <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
//               <span>{getConnectionStatusIcon()}</span>
//               <span style={{ 
//                 fontSize: '14px', 
//                 color: getConnectionStatusColor(),
//                 fontWeight: '500'
//               }}>
//                 {connectionStatus}
//               </span>
//               {connectionStatus !== 'Connected' && (
//                 <button
//                   onClick={reconnect}
//                   style={{
//                     marginLeft: '10px',
//                     padding: '4px 8px',
//                     fontSize: '12px',
//                     border: '1px solid #007bff',
//                     borderRadius: '4px',
//                     backgroundColor: 'white',
//                     color: '#007bff',
//                     cursor: 'pointer'
//                   }}
//                 >
//                   Reconnect
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
        
//         {projectDescription && (
//           <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>
//             {projectDescription}
//           </p>
//         )}
        
//         <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '14px', color: '#666' }}>
//           <span><strong>Team:</strong> {teamName}</span>
//           <span><strong>Members:</strong> {teamMembers.join(', ')}</span>
//         </div>

//         {error && (
//           <div style={{ 
//             marginTop: '10px',
//             padding: '10px',
//             backgroundColor: '#fff3cd',
//             border: '1px solid #ffeaa7',
//             borderRadius: '4px',
//             color: '#856404',
//             fontSize: '14px'
//           }}>
//             ⚠️ {error}
//           </div>
//         )}
//       </div>

//       {/* Action Buttons */}
//       <div style={{ 
//         padding: '20px',
//         backgroundColor: 'white',
//         borderBottom: '1px solid #e0e0e0',
//         display: 'flex',
//         flexWrap: 'wrap',
//         gap: '10px'
//       }}>
//         <button
//           onClick={() => setActiveOperation('createCard')}
//           style={{
//             padding: '10px 15px',
//             backgroundColor: '#28a745',
//             color: 'white',
//             border: 'none',
//             borderRadius: '4px',
//             cursor: 'pointer',
//             fontSize: '14px'
//           }}
//         >
//           ➕ Create Card
//         </button>
//         <button
//           onClick={() => setActiveOperation('updateCard')}
//           style={{
//             padding: '10px 15px',
//             backgroundColor: '#007bff',
//             color: 'white',
//             border: 'none',
//             borderRadius: '4px',
//             cursor: 'pointer',
//             fontSize: '14px'
//           }}
//         >
//           ✏️ Update Card
//         </button>
//         <button
//           onClick={() => setActiveOperation('deleteCard')}
//           style={{
//             padding: '10px 15px',
//             backgroundColor: '#dc3545',
//             color: 'white',
//             border: 'none',
//             borderRadius: '4px',
//             cursor: 'pointer',
//             fontSize: '14px'
//           }}
//         >
//           🗑️ Delete Card
//         </button>
//         <button
//           onClick={() => setActiveOperation('createColumn')}
//           style={{
//             padding: '10px 15px',
//             backgroundColor: '#6f42c1',
//             color: 'white',
//             border: 'none',
//             borderRadius: '4px',
//             cursor: 'pointer',
//             fontSize: '14px'
//           }}
//         >
//           ➕ Create Column
//         </button>
//         <button
//           onClick={() => setActiveOperation('updateColumn')}
//           style={{
//             padding: '10px 15px',
//             backgroundColor: '#fd7e14',
//             color: 'white',
//             border: 'none',
//             borderRadius: '4px',
//             cursor: 'pointer',
//             fontSize: '14px'
//           }}
//         >
//           ✏️ Update Column
//         </button>
//         <button
//           onClick={() => setActiveOperation('deleteColumn')}
//           style={{
//             padding: '10px 15px',
//             backgroundColor: '#6c757d',
//             color: 'white',
//             border: 'none',
//             borderRadius: '4px',
//             cursor: 'pointer',
//             fontSize: '14px'
//           }}
//         >
//           🗑️ Delete Column
//         </button>
//         <button
//           onClick={() => setActiveOperation('updateBoard')}
//           style={{
//             padding: '10px 15px',
//             backgroundColor: '#20c997',
//             color: 'white',
//             border: 'none',
//             borderRadius: '4px',
//             cursor: 'pointer',
//             fontSize: '14px'
//           }}
//         >
//           ⚙️ Update Board
//         </button>
//         <button
//           onClick={loadBoardData}
//           style={{
//             padding: '10px 15px',
//             backgroundColor: '#17a2b8',
//             color: 'white',
//             border: 'none',
//             borderRadius: '4px',
//             cursor: 'pointer',
//             fontSize: '14px'
//           }}
//         >
//           🔄 Refresh
//         </button>
//       </div>

//       {/* Kanban Board */}
//       <div style={{ 
//         padding: '20px',
//         display: 'flex',
//         gap: '20px',
//         overflowX: 'auto',
//         minHeight: 'calc(100vh - 200px)'
//       }}>
//         {columns.map(column => (
//           <div
//             key={column.id}
//             style={{
//               backgroundColor: 'white',
//               borderRadius: '8px',
//               padding: '15px',
//               minWidth: '300px',
//               maxWidth: '300px',
//               boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
//               display: 'flex',
//               flexDirection: 'column'
//             }}
//           >
//             {/* Column Header */}
//             <div style={{ 
//               display: 'flex', 
//               justifyContent: 'space-between', 
//               alignItems: 'center',
//               marginBottom: '15px',
//               paddingBottom: '10px',
//               borderBottom: '2px solid #e9ecef'
//             }}>
//               <h3 style={{ 
//                 margin: 0, 
//                 color: '#333',
//                 fontSize: '16px',
//                 fontWeight: '600'
//               }}>
//                 {column.name}
//               </h3>
//               <div style={{ 
//                 backgroundColor: '#6c757d',
//                 color: 'white',
//                 borderRadius: '12px',
//                 padding: '2px 8px',
//                 fontSize: '12px',
//                 fontWeight: '500'
//               }}>
//                 {(column.cards || []).length}
//               </div>
//             </div>

//             {/* Column Info */}
//             <div style={{ 
//               fontSize: '12px', 
//               color: '#666', 
//               marginBottom: '10px',
//               display: 'flex',
//               justifyContent: 'space-between'
//             }}>
//               <span>ID: {column.id}</span>
//               <span>Pos: {column.position}</span>
//             </div>

//             {/* Cards */}
//             <div style={{ 
//               flex: 1,
//               display: 'flex',
//               flexDirection: 'column',
//               gap: '10px'
//             }}>
//               {(column.cards || []).map(card => (
//                 <div
//                   key={card.id}
//                   style={{
//                     backgroundColor: '#f8f9fa',
//                     border: '1px solid #e9ecef',
//                     borderRadius: '6px',
//                     padding: '12px',
//                     cursor: 'pointer',
//                     transition: 'all 0.2s ease',
//                     position: 'relative'
//                   }}
//                   onMouseEnter={(e) => {
//                     e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
//                     e.target.style.transform = 'translateY(-2px)';
//                   }}
//                   onMouseLeave={(e) => {
//                     e.target.style.boxShadow = 'none';
//                     e.target.style.transform = 'translateY(0)';
//                   }}
//                 >
//                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
//                     <h4 style={{ 
//                       margin: 0, 
//                       fontSize: '14px',
//                       fontWeight: '600',
//                       color: '#333',
//                       lineHeight: '1.3'
//                     }}>
//                       {card.title}
//                     </h4>
//                     <div style={{ display: 'flex', gap: '5px' }}>
//                       <button
//                         onClick={() => deleteCard(card.id, column.id)}
//                         style={{
//                           background: 'none',
//                           border: 'none',
//                           cursor: 'pointer',
//                           padding: '2px',
//                           fontSize: '12px',
//                           color: '#dc3545',
//                           borderRadius: '3px'
//                         }}
//                         title="Delete Card"
//                       >
//                         🗑️
//                       </button>
//                     </div>
//                   </div>
                  
//                   {card.description && (
//                     <p style={{ 
//                       margin: '0 0 8px 0',
//                       fontSize: '12px',
//                       color: '#666',
//                       lineHeight: '1.4'
//                     }}>
//                       {card.description}
//                     </p>
//                   )}
                  
//                   <div style={{ 
//                     display: 'flex',
//                     justifyContent: 'space-between',
//                     alignItems: 'center',
//                     fontSize: '11px',
//                     color: '#666'
//                   }}>
//                     <span>ID: {card.id}</span>
//                     {card.assignee && (
//                       <span style={{ 
//                         backgroundColor: '#007bff',
//                         color: 'white',
//                         padding: '2px 6px',
//                         borderRadius: '10px',
//                         fontSize: '10px'
//                       }}>
//                         {card.assignee}
//                       </span>
//                     )}
//                   </div>

//                   {/* Quick Actions */}
//                   <div style={{ 
//                     marginTop: '8px',
//                     display: 'flex',
//                     gap: '5px',
//                     flexWrap: 'wrap'
//                   }}>
//                     {columns.filter(col => col.id !== column.id).map(targetCol => (
//                       <button
//                         key={targetCol.id}
//                         onClick={() => moveCard(card.id, column.id, targetCol.id)}
//                         style={{
//                           fontSize: '10px',
//                           padding: '2px 6px',
//                           border: '1px solid #007bff',
//                           borderRadius: '3px',
//                           backgroundColor: 'white',
//                           color: '#007bff',
//                           cursor: 'pointer'
//                         }}
//                         title={`Move to ${targetCol.name}`}
//                       >
//                         → {targetCol.name}
//                       </button>
//                     ))}
                    
//                     {teamMembers.map(member => (
//                       <button
//                         key={member}
//                         onClick={() => assignCard(card.id, member)}
//                         style={{
//                           fontSize: '10px',
//                           padding: '2px 6px',
//                           border: '1px solid #28a745',
//                           borderRadius: '3px',
//                           backgroundColor: card.assignee === member ? '#28a745' : 'white',
//                           color: card.assignee === member ? 'white' : '#28a745',
//                           cursor: 'pointer'
//                         }}
//                         title={`Assign to ${member}`}
//                       >
//                         @ {member.split(' ')[0]}
//                       </button>
//                     ))}
//                   </div>
//                 </div>
//               ))}
              
//               {(column.cards || []).length === 0 && (
//                 <div style={{ 
//                   textAlign: 'center',
//                   color: '#999',
//                   fontSize: '14px',
//                   padding: '20px',
//                   fontStyle: 'italic'
//                 }}>
//                   No cards in this column
//                 </div>
//               )}
//             </div>
//           </div>
//         ))}

//         {columns.length === 0 && (
//           <div style={{ 
//             textAlign: 'center',
//             color: '#999',
//             fontSize: '18px',
//             padding: '40px',
//             fontStyle: 'italic',
//             width: '100%'
//           }}>
//             No columns found. Create a column to get started.
//           </div>
//         )}
//       </div>

//       {/* Operation Panel */}
//       {renderOperationPanel()}
//     </div>
//   );
// }

// export default function App() {
//   return <KanbanBoard boardId={1} projectId={1} />;
// }

