import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import ProjectsList from './components/projects/ProjectsList';
import ProjectDetails from './components/projects/ProjectDetails';
import CreateProject from './components/projects/CreateProject';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import Backlog from './components/backlog/Backlog';
import './App.css';

// Protected Route component
const ProtectedRoute = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const location = useLocation();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/auth/check-auth', {
                credentials: 'include'
            });
            const data = await response.json();
            setIsAuthenticated(data.authenticated);
        } catch (error) {
            console.error('Auth check failed:', error);
            setIsAuthenticated(false);
        }
    };

    if (isAuthenticated === null) {
        return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

function App() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkUserAuth();
    }, []);

    const checkUserAuth = async () => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                
                // Verify the session is still valid
                const response = await fetch('http://localhost:5000/api/auth/check-auth', {
                    credentials: 'include'
                });
                const data = await response.json();
                
                if (!data.authenticated) {
                    // Session is invalid, clear user data
                    localStorage.removeItem('user');
                    setUser(null);
                }
            }
        } catch (error) {
            console.error('Error checking user auth:', error);
            localStorage.removeItem('user');
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('http://localhost:5000/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            localStorage.removeItem('user');
            setUser(null);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const menuItems = [
        { path: '/projects', label: 'Projects', icon: '📋' },
        { path: '/projects/new', label: 'Create Project', icon: '➕' },
        { path: '/design', label: 'Design', icon: '🎨' },
        { path: '/backlogs', label: 'Backlogs', icon: '📝' },
        { path: '/version-control', label: 'Version Control', icon: '🔄' }
    ];

    if (isLoading) {
        return <div className="loading-screen">Loading...</div>;
    }

    return (
        <Router>
            <div className="app-layout">
                {user ? (
                    <>
                        <div className="top-bar">
                            <div className="top-bar-left">
                                <button 
                                    className="menu-toggle"
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                >
                                    ☰
                                </button>
                            </div>
                            <div className="top-bar-right">
                                <button className="notification-btn">🔔</button>
                                <div className="user-menu">
                                    <img src="https://via.placeholder.com/32" alt="User" className="user-avatar" />
                                    <span>{user.username}</span>
                                    <button onClick={handleLogout} className="logout-btn">Logout</button>
                                </div>
                            </div>
                        </div>

                        <div className="main-container">
                            <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                                <nav>
                                    {menuItems.map((item) => (
                                        <Link 
                                            key={item.path} 
                                            to={item.path}
                                            className="nav-item"
                                        >
                                            <span className="nav-icon">{item.icon}</span>
                                            {isSidebarOpen && <span className="nav-label">{item.label}</span>}
                                        </Link>
                                    ))}
                                </nav>
                            </div>

                            <div className="main-content">
                                <Routes>
                                    <Route path="/" element={<Navigate to="/projects" replace />} />
                                    <Route path="/login" element={<Navigate to="/projects" replace />} />
                                    <Route path="/projects" element={
                                        <ProtectedRoute>
                                            <ProjectsList />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="/projects/:projectId" element={
                                        <ProtectedRoute>
                                            <ProjectDetails />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="/projects/new" element={
                                        <ProtectedRoute>
                                            <CreateProject />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="/design" element={
                                        <ProtectedRoute>
                                            <div>Design</div>
                                        </ProtectedRoute>
                                    } />
                                    <Route path="/backlogs" element={
                                        <ProtectedRoute>
                                            <Backlog />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="/version-control" element={
                                        <ProtectedRoute>
                                            <div>Version Control</div>
                                        </ProtectedRoute>
                                    } />
                                </Routes>
                            </div>
                        </div>
                    </>
                ) : (
                    <Routes>
                        <Route path="/login" element={<Login onLoginSuccess={(userData) => setUser(userData)} />} />
                        <Route path="/signup" element={<SignUp />} />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                )}
            </div>
        </Router>
    );
}

export default App;
