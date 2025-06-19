// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './auth/LoginPage';
import ProjectList from './dashboard/ProjectList';
import BoardPage from './board/BoardPage';

// Create a wrapper component to use the auth context
function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />} 
      />
      <Route 
        path="/dashboard" 
        element={isAuthenticated ? <ProjectList /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/board/:id" 
        element={isAuthenticated ? <BoardPage /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} 
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div>
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
// // src/App.jsx
// import React, { useState, useEffect } from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import LoginPage from './auth/LoginPage';
// import ProjectList from './dashboard/ProjectList';
// import BoardPage from './board/BoardPage';

// function App() {
//   const [token, setToken] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const checkToken = async () => {
//       const storedToken = localStorage.getItem('token');
      
//       if (!storedToken) {
//         console.log('No token found, redirecting to login');
//         setToken(null);
//         setLoading(false);
//         return;
//       }

//       // Verify token is still valid by making a test request
//       try {
//         const response = await fetch('http://localhost:8000/api/projects/', {
//           headers: { 
//             'Authorization': `Bearer ${storedToken}`,
//             'Content-Type': 'application/json'
//           },
//         });

//         if (response.ok) {
//           console.log('Token is valid');
//           setToken(storedToken);
//         } else {
//           console.log('Token is invalid, clearing storage');
//           localStorage.removeItem('token');
//           localStorage.removeItem('refresh_token');
//           setToken(null);
//         }
//       } catch (error) {
//         console.error('Error verifying token:', error);
//         localStorage.removeItem('token');
//         localStorage.removeItem('refresh_token');
//         setToken(null);
//       }
      
//       setLoading(false);
//     };

//     checkToken();
//   }, []);

//   // Function to update token state when login occurs
//   const handleLogin = (newToken) => {
//     console.log('Login successful, updating app state');
//     setToken(newToken);
//   };

//   const handleLogout = () => {
//     localStorage.removeItem('token');
//     localStorage.removeItem('refresh_token');
//     setToken(null);
//   };

//   if (loading) {
//     return (
//       <div style={{ 
//         display: 'flex', 
//         justifyContent: 'center', 
//         alignItems: 'center', 
//         height: '100vh',
//         fontSize: '18px'
//       }}>
//         Loading...
//       </div>
//     );
//   }

//   return (
//     <Router>
//       <div>
//         <Routes>
//           <Route 
//             path="/login" 
//             element={!token ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/dashboard" replace />} 
//           />
//           <Route 
//             path="/dashboard" 
//             element={token ? <ProjectList onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
//           />
//           <Route 
//             path="/board/:id" 
//             element={token ? <BoardPage onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
//           />
//           <Route 
//             path="/" 
//             element={<Navigate to={token ? "/dashboard" : "/login"} replace />} 
//           />
//         </Routes>
//       </div>
//     </Router>
//   );
// }

// export default App;