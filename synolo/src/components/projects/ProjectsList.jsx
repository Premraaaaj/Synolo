import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { projectService } from '../../services/projectService';
import ProjectBacklog from './ProjectBacklog';
import './ProjectsList.css';

const ProjectsList = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const location = useLocation();

    useEffect(() => {
        fetchProjects();
    }, [location.pathname]); // Refresh when route changes (e.g., after creating a project)

    const fetchProjects = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('Fetching projects...');
            
            const data = await projectService.getAllProjects();
            console.log('Received projects data:', data);
            
            if (data && Array.isArray(data)) {
                // Sort projects by creation date, newest first
                const sortedProjects = data.sort((a, b) => {
                    const dateA = new Date(a.created_at || a.createdAt);
                    const dateB = new Date(b.created_at || b.createdAt);
                    return dateB - dateA;
                });
                setProjects(sortedProjects);
                console.log('Projects set in state:', sortedProjects);
            } else {
                console.error('Invalid projects data structure:', data);
                setProjects([]);
            }
        } catch (err) {
            console.error('Error fetching projects:', err);
            setError('Failed to load projects. Please try again later.');
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (projectId) => {
        if (window.confirm('Are you sure you want to delete this project?')) {
            try {
                await projectService.deleteProject(projectId);
                setProjects(projects.filter(project => project.project_id !== projectId));
            } catch (err) {
                console.error('Error deleting project:', err);
                setError('Failed to delete project');
            }
        }
    };

    const handleBacklogClick = (e, projectId) => {
        e.stopPropagation();
        setSelectedProjectId(projectId);
    };

    if (loading) {
        return (
            <div className="projects-container">
                <div className="loading">Loading projects...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="projects-container">
                <div className="error-message">
                    {error}
                    <button onClick={fetchProjects} className="retry-button">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="projects-container">
            <div className="projects-header">
                <h1>My Projects</h1>
                <div className="header-actions">
                    <button onClick={fetchProjects} className="refresh-button">
                        Refresh
                    </button>
                    <Link to="/projects/new" className="create-project-btn">
                        Create New Project
                    </Link>
                </div>
            </div>

            {projects.length === 0 ? (
                <div className="no-projects">
                    <div className="no-projects-content">
                        <h2>No Projects Available</h2>
                        <p>You haven't created any projects yet. Start by creating your first project!</p>
                        <Link to="/projects/new" className="create-project-btn">
                            Create Your First Project
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="projects-grid">
                    {projects.map(project => (
                        <div key={project.project_id} className="project-card">
                            <div className="project-card-content">
                                <h3>{project.project_name}</h3>
                                <p>{project.project_description}</p>
                                <div className="project-meta">
                                    <span className="project-status">{project.status || 'Active'}</span>
                                    <span className="project-date">
                                        Created: {new Date(project.created_at || project.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="project-actions">
                                    <Link to={`/projects/${project.project_id}`} className="view-project-btn">
                                        View Project
                                    </Link>
                                    <button 
                                        onClick={(e) => handleBacklogClick(e, project.project_id)}
                                        className="backlog-btn"
                                    >
                                        View Backlog
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(project.project_id)}
                                        className="delete-project-btn"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedProjectId && (
                <ProjectBacklog 
                    projectId={selectedProjectId} 
                    onClose={() => setSelectedProjectId(null)} 
                />
            )}
        </div>
    );
};

export default ProjectsList; 