import React, { useState, useEffect, useRef } from 'react';

// Mock API service - replace with actual API endpoints
const API_BASE = 'http://localhost:8000/api';

class ApiService {
  static async request(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('authToken');
          window.location.href = '/login';
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  static async get(endpoint) {
    return this.request(endpoint);
  }

  static async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  static async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }
}

// WebSocket hook for real-time updates
function useWebSocket(boardId, onMessage) {
  const ws = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token || !boardId) return;

    const wsUrl = `ws://localhost:8000/ws/board/${boardId}/?token=${token}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setConnectionStatus('Connected');
      console.log('WebSocket connected');
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    ws.current.onclose = (event) => {
      setConnectionStatus('Disconnected');
      console.log('WebSocket disconnected:', event.code);
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (ws.current?.readyState === WebSocket.CLOSED) {
          setConnectionStatus('Reconnecting...');
          // Trigger re-render to recreate connection
        }
      }, 3000);
    };

    ws.current.onerror = (error) => {
      setConnectionStatus('Error');
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [boardId, onMessage]);

  const sendMessage = (message) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  return { sendMessage, connectionStatus };
}

function KanbanBoard({ boardId = 1, projectId = 1 }) {
  // Board state
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [projectName, setProjectName] = useState('Loading...');
  const [projectDescription, setProjectDescription] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);

  // Form states for operations
  const [activeOperation, setActiveOperation] = useState(null);
  const [formData, setFormData] = useState({
    cardTitle: '',
    cardDescription: '',
    columnId: 1,
    assignee: '',
    cardId: '',
    columnTitle: '',
    columnIdToUpdate: '',
    position: 0,
    boardTitle: '',
    boardDescription: ''
  });

  // Handle WebSocket messages
  const handleWebSocketMessage = (data) => {
    console.log('WebSocket message received:', data);
    
    switch (data.type) {
      case 'card.created':
        setColumns(prev => prev.map(col => 
          col.id === data.card.column_id 
            ? { ...col, cards: [...col.cards, data.card] }
            : col
        ));
        break;
        
      case 'card.updated':
        setColumns(prev => prev.map(col => ({
          ...col,
          cards: col.cards.map(card => 
            card.id === data.card.id ? { ...card, ...data.card } : card
          )
        })));
        break;
        
      case 'card.deleted':
        setColumns(prev => prev.map(col => ({
          ...col,
          cards: col.cards.filter(card => card.id !== data.card_id)
        })));
        break;
        
      case 'card.moved':
        setColumns(prev => {
          let cardToMove = null;
          const newColumns = prev.map(col => ({
            ...col,
            cards: col.cards.filter(card => {
              if (card.id === data.card_id) {
                cardToMove = card;
                return false;
              }
              return true;
            })
          }));

          if (cardToMove) {
            return newColumns.map(col => 
              col.id === data.new_column_id
                ? { ...col, cards: [...col.cards, cardToMove] }
                : col
            );
          }
          return newColumns;
        });
        break;
        
      case 'card.assigned':
        setColumns(prev => prev.map(col => ({
          ...col,
          cards: col.cards.map(card => 
            card.id === data.card_id 
              ? { ...card, assignee: data.assignee }
              : card
          )
        })));
        break;
        
      case 'column.created':
        setColumns(prev => [...prev, data.column]);
        break;
        
      case 'column.updated':
        setColumns(prev => prev.map(col => 
          col.id === data.column.id ? { ...col, ...data.column } : col
        ));
        break;
        
      case 'column.deleted':
        setColumns(prev => prev.filter(col => col.id !== data.column_id));
        break;
        
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  };

  const { sendMessage, connectionStatus } = useWebSocket(boardId, handleWebSocketMessage);

  // Load initial data
  useEffect(() => {
    loadBoardData();
  }, [boardId, projectId]);

  const loadBoardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load board and project data
      const [boardData, projectData] = await Promise.all([
        ApiService.get(`/boards/${boardId}/`),
        ApiService.get(`/projects/${projectId}/`)
      ]);
      
      setProjectName(projectData.name);
      setProjectDescription(projectData.description);
      setTeamName(projectData.team_name);
      setTeamMembers(projectData.team_members || []);
      
      // Load columns and cards
      const columnsData = await ApiService.get(`/boards/${boardId}/columns/`);
      setColumns(columnsData);
      
    } catch (err) {
      setError(err.message);
      console.error('Failed to load board data:', err);
      
      // Fallback to local data for demo
      setColumns([
        { id: 1, name: 'To Do', cards: [], position: 0 },
        { id: 2, name: 'In Progress', cards: [], position: 1 },
        { id: 3, name: 'Done', cards: [], position: 2 }
      ]);
      setProjectName('Demo Kanban Project');
      setProjectDescription('Demo board (API unavailable)');
      setTeamName('Demo Team');
      setTeamMembers(['John Doe', 'Jane Smith']);
    } finally {
      setLoading(false);
    }
  };

  // Card Operations with real API integration
  const createCard = async () => {
    if (!formData.cardTitle.trim()) {
      alert('Please enter a card title');
      return;
    }
    
    const cardData = {
      title: formData.cardTitle.trim(),
      description: formData.cardDescription.trim(),
      column_id: parseInt(formData.columnId),
      assignee: formData.assignee || 'Unassigned',
      board_id: boardId
    };
    
    try {
      const newCard = await ApiService.post('/cards/', cardData);
      
      // WebSocket will handle the UI update, but update locally as fallback
      setColumns(prev => prev.map(col => 
        col.id === cardData.column_id 
          ? { ...col, cards: [...col.cards, newCard] }
          : col
      ));
      
      // Send WebSocket message
      sendMessage({
        type: 'card.created',
        card: newCard
      });
      
      // Reset form
      setFormData(prev => ({ 
        ...prev, 
        cardTitle: '', 
        cardDescription: '', 
        assignee: '' 
      }));
      setActiveOperation(null);
      
      alert('Card created successfully!');
    } catch (error) {
      alert('Error creating card: ' + error.message);
    }
  };

  const updateCard = async () => {
    if (!formData.cardId || !formData.cardTitle.trim()) {
      alert('Please enter both Card ID and Title');
      return;
    }
    
    const cardData = {
      title: formData.cardTitle.trim(),
      description: formData.cardDescription.trim(),
      assignee: formData.assignee
    };
    
    try {
      const updatedCard = await ApiService.put(`/cards/${formData.cardId}/`, cardData);
      
      // Update local state
      setColumns(prev => prev.map(col => ({
        ...col,
        cards: col.cards.map(card => 
          card.id === parseInt(formData.cardId)
            ? { ...card, ...updatedCard }
            : card
        )
      })));
      
      // Send WebSocket message
      sendMessage({
        type: 'card.updated',
        card: updatedCard
      });
      
      setFormData(prev => ({ 
        ...prev, 
        cardTitle: '', 
        cardDescription: '', 
        assignee: '',
        cardId: ''
      }));
      setActiveOperation(null);
      
      alert('Card updated successfully!');
    } catch (error) {
      alert('Error updating card: ' + error.message);
    }
  };

  const deleteCard = async (cardId, columnId) => {
    const idToDelete = cardId || parseInt(formData.cardId);
    
    if (!idToDelete) {
      alert('Please provide a card ID');
      return;
    }
    
    try {
      await ApiService.delete(`/cards/${idToDelete}/`);
      
      // Update local state
      setColumns(prev => prev.map(col => ({
        ...col,
        cards: col.cards.filter(card => card.id !== idToDelete)
      })));
      
      // Send WebSocket message
      sendMessage({
        type: 'card.deleted',
        card_id: idToDelete
      });
      
      if (!cardId) {
        setFormData(prev => ({ ...prev, cardId: '' }));
        setActiveOperation(null);
      }
      
      alert('Card deleted successfully!');
    } catch (error) {
      alert('Error deleting card: ' + error.message);
    }
  };

  const moveCard = async (cardId, fromColumnId, toColumnId) => {
    const moveData = {
      old_column_id: fromColumnId,
      new_column_id: toColumnId
    };
    
    try {
      await ApiService.put(`/cards/${cardId}/move/`, moveData);
      
      // Update local state
      setColumns(prev => {
        let cardToMove = null;
        const newColumns = prev.map(col => ({
          ...col,
          cards: col.cards.filter(card => {
            if (card.id === cardId) {
              cardToMove = card;
              return false;
            }
            return true;
          })
        }));

        if (cardToMove) {
          return newColumns.map(col => 
            col.id === toColumnId
              ? { ...col, cards: [...col.cards, cardToMove] }
              : col
          );
        }
        return newColumns;
      });
      
      // Send WebSocket message
      sendMessage({
        type: 'card.moved',
        card_id: cardId,
        old_column_id: fromColumnId,
        new_column_id: toColumnId
      });
      
      alert('Card moved successfully!');
    } catch (error) {
      alert('Error moving card: ' + error.message);
    }
  };

  const assignCard = async (cardId, assignee) => {
    try {
      await ApiService.put(`/cards/${cardId}/assign/`, { assignee });
      
      // Update local state
      setColumns(prev => prev.map(col => ({
        ...col,
        cards: col.cards.map(card => 
          card.id === cardId 
            ? { ...card, assignee }
            : card
        )
      })));
      
      // Send WebSocket message
      sendMessage({
        type: 'card.assigned',
        card_id: cardId,
        assignee: assignee
      });
      
      alert('Card assigned successfully!');
    } catch (error) {
      alert('Error assigning card: ' + error.message);
    }
  };

  // Column Operations
  const createColumn = async () => {
    if (!formData.columnTitle.trim()) {
      alert('Please enter a column title');
      return;
    }
    
    const columnData = {
      name: formData.columnTitle.trim(),
      position: parseInt(formData.position),
      board_id: boardId
    };
    
    try {
      const newColumn = await ApiService.post('/columns/', columnData);
      
      setColumns(prev => [...prev, { ...newColumn, cards: [] }]);
      
      sendMessage({
        type: 'column.created',
        column: newColumn
      });
      
      setFormData(prev => ({ ...prev, columnTitle: '', position: 0 }));
      setActiveOperation(null);
      
      alert('Column created successfully!');
    } catch (error) {
      alert('Error creating column: ' + error.message);
    }
  };

  const updateColumn = async () => {
    if (!formData.columnIdToUpdate || !formData.columnTitle.trim()) {
      alert('Please enter both Column ID and Title');
      return;
    }
    
    const columnData = {
      name: formData.columnTitle.trim(),
      position: parseInt(formData.position)
    };
    
    try {
      const updatedColumn = await ApiService.put(`/columns/${formData.columnIdToUpdate}/`, columnData);
      
      setColumns(prev => prev.map(col => 
        col.id === parseInt(formData.columnIdToUpdate)
          ? { ...col, ...updatedColumn }
          : col
      ));
      
      sendMessage({
        type: 'column.updated',
        column: updatedColumn
      });
      
      setFormData(prev => ({ 
        ...prev, 
        columnIdToUpdate: '', 
        columnTitle: '', 
        position: 0 
      }));
      setActiveOperation(null);
      
      alert('Column updated successfully!');
    } catch (error) {
      alert('Error updating column: ' + error.message);
    }
  };

  const deleteColumn = async () => {
    if (!formData.columnIdToUpdate) {
      alert('Please enter a column ID');
      return;
    }
    
    const columnId = parseInt(formData.columnIdToUpdate);
    
    try {
      await ApiService.delete(`/columns/${columnId}/`);
      
      setColumns(prev => prev.filter(col => col.id !== columnId));
      
      sendMessage({
        type: 'column.deleted',
        column_id: columnId
      });
      
      setFormData(prev => ({ ...prev, columnIdToUpdate: '' }));
      setActiveOperation(null);
      
      alert('Column deleted successfully!');
    } catch (error) {
      alert('Error deleting column: ' + error.message);
    }
  };

  // Board Operations
  const updateBoard = async () => {
    if (!formData.boardTitle.trim()) {
      alert('Please enter a board title');
      return;
    }
    
    const boardData = {
      name: formData.boardTitle.trim(),
      description: formData.boardDescription.trim()
    };
    
    try {
      await ApiService.put(`/projects/${projectId}/`, boardData);
      
      setProjectName(boardData.name);
      setProjectDescription(boardData.description);
      
      setFormData(prev => ({ ...prev, boardTitle: '', boardDescription: '' }));
      setActiveOperation(null);
      
      alert('Board updated successfully!');
    } catch (error) {
      alert('Error updating board: ' + error.message);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'Connected': return '#28a745';
      case 'Reconnecting...': return '#ffc107';
      case 'Error': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔄</div>
          <h2>Loading Board...</h2>
        </div>
      </div>
    );
  }

  const renderOperationPanel = () => {
    if (!activeOperation) return null;

    const panelStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      padding: '25px',
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      zIndex: 1000,
      minWidth: '400px',
      maxWidth: '90vw'
    };

    const overlayStyle = {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 999
    };

    const inputStyle = {
      width: '100%',
      padding: '12px',
      marginBottom: '15px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      fontFamily: 'inherit'
    };

    const textareaStyle = {
      ...inputStyle,
      minHeight: '80px',
      resize: 'vertical'
    };

    return (
      <>
        <div style={overlayStyle} onClick={() => setActiveOperation(null)} />
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>
            {activeOperation.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          </h3>
          
          {activeOperation === 'createCard' && (
            <>
              <input
                type="text"
                placeholder="Card Title *"
                value={formData.cardTitle}
                onChange={(e) => handleInputChange('cardTitle', e.target.value)}
                style={inputStyle}
                required
              />
              <textarea
                placeholder="Card Description"
                value={formData.cardDescription}
                onChange={(e) => handleInputChange('cardDescription', e.target.value)}
                style={textareaStyle}
              />
              <select
                value={formData.columnId}
                onChange={(e) => handleInputChange('columnId', e.target.value)}
                style={inputStyle}
              >
                {columns.map(col => (
                  <option key={col.id} value={col.id}>{col.name} (ID: {col.id})</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Assignee (optional)"
                value={formData.assignee}
                onChange={(e) => handleInputChange('assignee', e.target.value)}
                style={inputStyle}
              />
            </>
          )}

          {activeOperation === 'updateCard' && (
            <>
              <input
                type="number"
                placeholder="Card ID *"
                value={formData.cardId}
                onChange={(e) => handleInputChange('cardId', e.target.value)}
                style={inputStyle}
                required
              />
              <input
                type="text"
                placeholder="Card Title *"
                value={formData.cardTitle}
                onChange={(e) => handleInputChange('cardTitle', e.target.value)}
                style={inputStyle}
                required
              />
              <textarea
                placeholder="Card Description"
                value={formData.cardDescription}
                onChange={(e) => handleInputChange('cardDescription', e.target.value)}
                style={textareaStyle}
              />
              <input
                type="text"
                placeholder="Assignee (optional)"
                value={formData.assignee}
                onChange={(e) => handleInputChange('assignee', e.target.value)}
                style={inputStyle}
              />
            </>
          )}

          {activeOperation === 'deleteCard' && (
            <input
              type="number"
              placeholder="Card ID *"
              value={formData.cardId}
              onChange={(e) => handleInputChange('cardId', e.target.value)}
              style={inputStyle}
              required
            />
          )}

          {activeOperation === 'createColumn' && (
            <>
              <input
                type="text"
                placeholder="Column Title *"
                value={formData.columnTitle}
                onChange={(e) => handleInputChange('columnTitle', e.target.value)}
                style={inputStyle}
                required
              />
              <input
                type="number"
                placeholder="Position (0, 1, 2...)"
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
                style={inputStyle}
              />
            </>
          )}

          {(activeOperation === 'updateColumn' || activeOperation === 'deleteColumn') && (
            <>
              <input
                type="number"
                placeholder="Column ID *"
                value={formData.columnIdToUpdate}
                onChange={(e) => handleInputChange('columnIdToUpdate', e.target.value)}
                style={inputStyle}
                required
              />
              {activeOperation === 'updateColumn' && (
                <>
                  <input
                    type="text"
                    placeholder="Column Title *"
                    value={formData.columnTitle}
                    onChange={(e) => handleInputChange('columnTitle', e.target.value)}
                    style={inputStyle}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Position (0, 1, 2...)"
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    style={inputStyle}
                  />
                </>
              )}
            </>
          )}

          {activeOperation === 'updateBoard' && (
            <>
              <input
                type="text"
                placeholder="Board Title *"
                value={formData.boardTitle}
                onChange={(e) => handleInputChange('boardTitle', e.target.value)}
                style={inputStyle}
                required
              />
              <textarea
                placeholder="Board Description"
                value={formData.boardDescription}
                onChange={(e) => handleInputChange('boardDescription', e.target.value)}
                style={textareaStyle}
              />
            </>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button
              onClick={() => setActiveOperation(null)}
              style={{ 
                padding: '12px 24px', 
                backgroundColor: '#6c757d', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                switch (activeOperation) {
                  case 'createCard': createCard(); break;
                  case 'updateCard': updateCard(); break;
                  case 'deleteCard': deleteCard(); break;
                  case 'createColumn': createColumn(); break;
                  case 'updateColumn': updateColumn(); break;
                  case 'deleteColumn': deleteColumn(); break;
                  case 'updateBoard': updateBoard(); break;
                }
              }}
              style={{ 
                padding: '12px 24px', 
                backgroundColor: '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Execute
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      backgroundColor: '#f5f6fa', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <h1 style={{ margin: 0, color: '#2c3e50' }}>{projectName}</h1>
            <p style={{ margin: '5px 0', color: '#7f8c8d' }}>{projectDescription}</p>
            <small style={{ color: '#95a5a6' }}>Team: {teamName} | Members: {teamMembers.join(', ')}</small>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '5px',
              padding: '8px 16px',
              borderRadius: '20px',
              backgroundColor: connectionStatus === 'Connected' ? '#d4edda' : '#f8d7da',
              fontSize: '14px',
              color: getConnectionStatusColor()
            }}>
              <span>{connectionStatus === 'Connected' ? '🟢' : connectionStatus === 'Reconnecting...' ? '🟡' : '🔴'}</span>
              WebSocket: {connectionStatus}
            </div>
            {error && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px',
                padding: '8px 16px',
                borderRadius: '20px',
                backgroundColor: '#f8d7da',
                fontSize: '14px',
                color: '#721c24'
              }}>
                <span>⚠️</span>
                API Error
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Operations Panel */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>🎛️ Operations</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          <button
            onClick={() => setActiveOperation('createCard')}
            style={{ 
              padding: '12px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ➕ Create Card
          </button>
          <button
            onClick={() => setActiveOperation('updateCard')}
            style={{ 
              padding: '12px', 
              backgroundColor: '#ffc107', 
              color: '#212529', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ✏️ Update Card
          </button>
          <button
            onClick={() => setActiveOperation('deleteCard')}
            style={{ 
              padding: '12px', 
              backgroundColor: '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            🗑️ Delete Card
          </button>
          <button
            onClick={() => setActiveOperation('createColumn')}
            style={{ 
              padding: '12px', 
              backgroundColor: '#17a2b8', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            📋 Create Column
          </button>
          <button
            onClick={() => setActiveOperation('updateColumn')}
            style={{ 
              padding: '12px', 
              backgroundColor: '#6f42c1', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            🔧 Update Column
          </button>
          <button
            onClick={() => setActiveOperation('deleteColumn')}
            style={{ 
              padding: '12px', 
              backgroundColor: '#fd7e14', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            🗂️ Delete Column
          </button>
          <button
            onClick={() => setActiveOperation('updateBoard')}
            style={{ 
              padding: '12px', 
              backgroundColor: '#20c997', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            📊 Update Board
          </button>
          <button
            onClick={loadBoardData}
            style={{ 
              padding: '12px', 
              backgroundColor: '#6c757d', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        overflowX: 'auto', 
        paddingBottom: '20px',
        minHeight: '500px'
      }}>
        {columns.map(column => (
          <div
            key={column.id}
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              minWidth: '300px',
              maxWidth: '300px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '15px',
              paddingBottom: '10px',
              borderBottom: '2px solid #e9ecef'
            }}>
              <h3 style={{ 
                margin: 0, 
                color: '#2c3e50',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                {column.name}
              </h3>
              <span style={{ 
                backgroundColor: '#e9ecef', 
                color: '#6c757d',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {column.cards?.length || 0}
              </span>
            </div>

            <div style={{ 
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              minHeight: '200px'
            }}>
              {column.cards && column.cards.length > 0 ? (
                column.cards.map(card => (
                  <div
                    key={card.id}
                    style={{
                      backgroundColor: '#f8f9fa',
                      padding: '15px',
                      borderRadius: '6px',
                      border: '1px solid #e9ecef',
                      cursor: 'grab',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#e9ecef';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#f8f9fa';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <h4 style={{ 
                        margin: 0, 
                        color: '#2c3e50',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        lineHeight: '1.3'
                      }}>
                        {card.title}
                      </h4>
                      <span style={{ 
                        fontSize: '10px', 
                        color: '#6c757d',
                        backgroundColor: '#dee2e6',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        fontWeight: 'bold'
                      }}>
                        #{card.id}
                      </span>
                    </div>
                    
                    {card.description && (
                      <p style={{ 
                        margin: '0 0 12px 0', 
                        color: '#6c757d',
                        fontSize: '12px',
                        lineHeight: '1.4'
                      }}>
                        {card.description}
                      </p>
                    )}
                    
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      fontSize: '11px'
                    }}>
                      <span style={{ 
                        color: '#495057',
                        backgroundColor: card.assignee && card.assignee !== 'Unassigned' ? '#d1ecf1' : '#f8d7da',
                        padding: '4px 8px',
                        borderRadius: '10px',
                        fontWeight: 'bold'
                      }}>
                        👤 {card.assignee || 'Unassigned'}
                      </span>
                      
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          onClick={() => {
                            const newAssignee = prompt('Enter new assignee:', card.assignee || '');
                            if (newAssignee !== null) {
                              assignCard(card.id, newAssignee);
                            }
                          }}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '10px'
                          }}
                          title="Assign Card"
                        >
                          👥
                        </button>
                        
                        <select
                          onChange={(e) => {
                            if (e.target.value && e.target.value !== column.id.toString()) {
                              moveCard(card.id, column.id, parseInt(e.target.value));
                              e.target.value = column.id;
                            }
                          }}
                          defaultValue={column.id}
                          style={{
                            padding: '2px 4px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '10px'
                          }}
                          title="Move Card"
                        >
                          <option value={column.id}>📍</option>
                          {columns.filter(col => col.id !== column.id).map(col => (
                            <option key={col.id} value={col.id}>→ {col.name}</option>
                          ))}
                        </select>
                        
                        <button
                          onClick={() => deleteCard(card.id)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '10px'
                          }}
                          title="Delete Card"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{
                  textAlign: 'center',
                  color: '#6c757d',
                  fontStyle: 'italic',
                  padding: '40px 20px',
                  border: '2px dashed #dee2e6',
                  borderRadius: '6px'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>📝</div>
                  No cards yet
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add Column Button */}
        <div
          style={{
            minWidth: '250px',
            maxWidth: '250px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px dashed #dee2e6',
            cursor: 'pointer',
            color: '#6c757d',
            transition: 'all 0.2s ease'
          }}
          onClick={() => setActiveOperation('createColumn')}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#e9ecef';
            e.target.style.borderColor = '#adb5bd';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#f8f9fa';
            e.target.style.borderColor = '#dee2e6';
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>➕</div>
            <div style={{ fontWeight: 'bold' }}>Add Column</div>
          </div>
        </div>
      </div>

      {/* Operation Panel Modal */}
      {renderOperationPanel()}
    </div>
  );
}

export default KanbanBoard;