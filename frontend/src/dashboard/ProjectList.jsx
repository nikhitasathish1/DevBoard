import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        console.log('Fetching projects with token...');
        const res = await fetch('http://localhost:8000/api/projects/', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        console.log('Projects API response status:', res.status);

        if (res.ok) {
          const data = await res.json();
          console.log('Projects data:', data);
          setProjects(data);
          setError('');
        } else if (res.status === 401) {
          // Token is invalid, redirect to login
          console.log('Token is invalid, redirecting to login');
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          navigate('/login');
          return;
        } else {
          const errorData = await res.json().catch(() => ({}));
          setError(`Failed to fetch projects: ${errorData.detail || res.statusText}`);
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
          setError('Cannot connect to server. Please check if the Django server is running on http://localhost:8000');
        } else {
          setError('Network error. Please check your connection and try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  const createTestProject = async () => {
    const token = localStorage.getItem('token');
    const projectName = prompt('Enter project name:', 'Test Project');
    
    if (!projectName) return;

    try {
      const res = await fetch('http://localhost:8000/api/projects/', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectName,
          description: 'Created from frontend'
        })
      });

      if (res.ok) {
        // Refresh the projects list
        window.location.reload();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to create project: ${errorData.detail || res.statusText}`);
      }
    } catch (err) {
      console.error('Error creating project:', err);
      alert('Failed to create project. Please try again.');
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        fontSize: '18px'
      }}>
        Loading projects...
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
          border: '1px solid #f5c6cb',
          marginBottom: '20px'
        }}>
          {error}
        </div>
        <button 
          onClick={() => window.location.reload()}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Retry
        </button>
        <button 
          onClick={handleLogout}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        paddingBottom: '15px',
        borderBottom: '2px solid #e9ecef'
      }}>
        <h2 style={{ margin: 0, color: '#333' }}>My Projects</h2>
        <div>
          <button 
            onClick={createTestProject}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            + New Project
          </button>
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
      
      {projects.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ color: '#6c757d', marginBottom: '15px' }}>No projects found</h3>
          <p style={{ color: '#6c757d', marginBottom: '20px' }}>
            Create your first project to get started with the kanban board.
          </p>
          <button 
            onClick={createTestProject}
            style={{ 
              padding: '12px 24px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Create First Project
          </button>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '20px', 
          marginTop: '20px' 
        }}>
          {projects.map((project) => (
            <div key={project.id} style={{ 
              border: '1px solid #dee2e6', 
              padding: '20px', 
              borderRadius: '8px',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}>
              <h3 style={{ 
                margin: '0 0 10px 0', 
                color: '#333',
                fontSize: '20px'
              }}>
                {project.name}
              </h3>
              <p style={{ 
                color: '#666', 
                margin: '0 0 20px 0',
                lineHeight: '1.5'
              }}>
                {project.description || 'No description available'}
              </p>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center'
              }}>
                <small style={{ color: '#999' }}>
                  Project ID: {project.id}
                </small>
                <button 
                  onClick={() => navigate(`/board/${project.id}`)}
                  style={{ 
                    padding: '10px 20px', 
                    backgroundColor: '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
                >
                  Open Board →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div style={{ 
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>Getting Started</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#6c757d' }}>
          <li>Make sure your Django backend is running on <strong>http://localhost:8000</strong></li>
          <li>Create projects using the "New Project" button</li>
          <li>Click "Open Board" to access the kanban board for each project</li>
          <li>Use the board to create cards, move them between columns, and collaborate in real-time</li>
        </ul>
      </div>
    </div>
  );
}

export default ProjectList;

// import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';

// function ProjectList() {
//   const [projects, setProjects] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const navigate = useNavigate();

//   useEffect(() => {
//     const fetchProjects = async () => {
//       const token = localStorage.getItem('token');
      
//       try {
//         const res = await fetch('http://localhost:8000/api/projects/', {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         if (res.ok) {
//           const data = await res.json();
//           setProjects(data);
//         } else {
//           setError('Failed to fetch projects');
//         }
//       } catch (err) {
//         setError('Network error. Please check if the server is running.');
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchProjects();
//   }, []);

//   const handleLogout = () => {
//     localStorage.removeItem('token');
//     localStorage.removeItem('refresh_token');
//     navigate('/login');
//   };

//   if (loading) return <div>Loading projects...</div>;
//   if (error) return <div style={{ color: 'red' }}>{error}</div>;

//   return (
//     <div style={{ padding: '20px' }}>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//         <h2>Projects</h2>
//         <button 
//           onClick={handleLogout}
//           style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', cursor: 'pointer' }}
//         >
//           Logout
//         </button>
//       </div>
      
//       {projects.length === 0 ? (
//         <p>No projects found.</p>
//       ) : (
//         <div style={{ display: 'grid', gap: '10px', marginTop: '20px' }}>
//           {projects.map((project) => (
//             <div key={project.id} style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '4px' }}>
//               <h3>{project.name}</h3>
//               <p>{project.description || 'No description'}</p>
//               <button 
//                 onClick={() => navigate(`/board/${project.id}`)}
//                 style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
//               >
//                 Open Board
//               </button>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// export default ProjectList;