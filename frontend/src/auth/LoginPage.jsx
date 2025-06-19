import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = '/api/token/';
    const payload = { username, password };

    console.log('Attempting login with:', { endpoint, username });

    try {
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('Response data keys:', Object.keys(data));

        // For JWT tokens from SimpleJWT, the response contains 'access' and 'refresh'
        const accessToken = data.access;
        const refreshToken = data.refresh;
        
        console.log('Login successful. Tokens received:', {
          access: accessToken ? 'Yes' : 'No',
          refresh: refreshToken ? 'Yes' : 'No'
        });
        
        if (accessToken) {
          localStorage.setItem('token', accessToken);
          localStorage.setItem('refresh_token', refreshToken || '');
          
          // Update the parent component's state
          onLogin(accessToken);
          
          // Use React Router navigation instead of window.location
          console.log('Navigating to dashboard...');
          navigate('/dashboard');
        } else {
          setError('No access token received from server');
          console.error('Expected access token but got:', data);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        console.error('Login failed:', data);
        
        // Handle different error responses
        if (res.status === 401) {
          setError('Invalid username or password');
        } else if (res.status >= 500) {
          setError('Server error. Please try again later.');
        } else {
          setError(data.detail || data.message || `Login failed (${res.status})`);
        }
      }
    } catch (err) {
      console.error('Network error:', err);
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Cannot connect to server. Please check if the Django server is running on http://localhost:8000');
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Clear any existing tokens when login page loads
  React.useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
  }, []);

  return (
    <div style={{ 
      maxWidth: '400px', 
      margin: '100px auto', 
      padding: '30px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      backgroundColor: 'white'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>Login to DevBoard</h2>
      
      {error && (
        <div style={{ 
          color: '#dc3545', 
          backgroundColor: '#f8d7da', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Username:</label>
          <input 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="Enter your username" 
            required 
            style={{ 
              width: '100%',
              padding: '10px', 
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Password:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Enter your password" 
            required 
            style={{ 
              width: '100%',
              padding: '10px', 
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '12px', 
            fontSize: '16px', 
            backgroundColor: loading ? '#6c757d' : '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      <div style={{ 
        marginTop: '30px', 
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        fontSize: '14px', 
        color: '#666' 
      }}>
        <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>For testing:</p>
        <p style={{ margin: '0 0 5px 0' }}>Create a Django superuser account:</p>
        <code style={{ 
          backgroundColor: '#e9ecef', 
          padding: '4px 8px', 
          borderRadius: '3px',
          fontSize: '12px'
        }}>
          python manage.py createsuperuser
        </code>
        <p style={{ margin: '10px 0 0 0', fontSize: '12px' }}>
          Make sure your Django server is running on <strong>http://localhost:8000</strong>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;