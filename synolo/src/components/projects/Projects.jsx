import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../../services/projectService';
import './Projects.css';

const Projects = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Get current user ID from localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            const userId = user.user_id || user.id || user._id;
            setCurrentUserId(userId);
        }
    }, []);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await projectService.getAllProjects();
                console.log('Fetched projects:', data);
                setProjects(data);
            } catch (err) {
                console.error('Error in Projects component:', err);
                setError(err.message || 'Failed to fetch projects');
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const handleCreateProject = () => {
        navigate('/create-project');
    };

    const handleProjectClick = (projectId) => {
        navigate(`/project/${projectId}`);
    };

    if (loading) {
        return <div className="projects-loading">Loading projects...</div>;
    }

    if (error) {
        return (
            <div className="projects-error">
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>Retry</button>
            </div>
        );
    }

    return (
        <div className="projects-container">
            <div className="projects-header">
                <h2>My Projects</h2>
                <button onClick={handleCreateProject} className="create-project-btn">
                    Create New Project
                </button>
            </div>

            {projects.length === 0 ? (
                <div className="no-projects">
                    <p>You don't have any projects yet.</p>
                    <button onClick={handleCreateProject} className="create-project-btn">
                        Create Your First Project
                    </button>
                </div>
            ) : (
                <div className="projects-grid">
                    {projects.map((project) => (
                        <div
                            key={project.project_id}
                            className="project-card"
                            onClick={() => handleProjectClick(project.project_id)}
                        >
                            <h3>{project.project_name}</h3>
                            <p>{project.project_description || 'No description'}</p>
                            <div className="project-meta">
                                <span className="project-members">
                                    {project.members?.length || 0} members
                                </span>
                                <span className="project-owner">
                                    {project.owner_id === currentUserId ? 'Owner' : 'Member'}
                                </span>
                            </div>
                            <div className="project-tasks">
                                {project.tasks?.length || 0} tasks
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Projects; 