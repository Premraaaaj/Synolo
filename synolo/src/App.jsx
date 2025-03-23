import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import ProjectsList from './components/projects/ProjectsList';
import ProjectDetails from './components/projects/ProjectDetails';
import CreateProject from './components/projects/CreateProject';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import './App.css';

// Protected Route component
const ProtectedRoute = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);

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
        return <Navigate to="/login" />;
    }

    return children;
};

function App() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Check if user is logged in
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

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
                                    <span>{user.email}</span>
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
                                    <Route path="/login" element={<Navigate to="/projects" />} />
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
                                            <div>Backlogs</div>
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
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<SignUp />} />
                        <Route path="*" element={<Navigate to="/login" />} />
                    </Routes>
                )}
            </div>
        </Router>
    );
}

export default App;
