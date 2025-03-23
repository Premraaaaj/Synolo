import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { projectService } from '../../services/projectService';
import './ProjectsList.css';

const ProjectsList = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await projectService.getAllProjects();
            if (response && response.projects) {
                // Ensure each project has a unique draggableId as a string
                const projectsWithIds = response.projects.map(project => ({
                    ...project,
                    draggableId: String(project._id || project.project_id) // Convert to string explicitly
                }));
                setProjects(projectsWithIds);
            } else {
                setProjects([]);
            }
        } catch (err) {
            console.error('Error fetching projects:', err);
            setError('Failed to load projects');
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

    const onDragEnd = (result) => {
        if (!result.destination) return;

        const items = Array.from(projects);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setProjects(items);
    };

    if (loading) {
        return (
            <div className="projects-dashboard">
                <div className="loading">Loading projects...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="projects-dashboard">
                <div className="error">{error}</div>
            </div>
        );
    }

    return (
        <div className="projects-dashboard">
            <div className="dashboard-header">
                <div className="header-left">
                    <h1>Projects</h1>
                    <span className="project-count">{projects.length} projects</span>
                </div>
                <div className="header-right">
                    <div className="view-toggle">
                        <button 
                            className={viewMode === 'grid' ? 'active' : ''} 
                            onClick={() => setViewMode('grid')}
                        >
                            Grid
                        </button>
                        <button 
                            className={viewMode === 'list' ? 'active' : ''} 
                            onClick={() => setViewMode('list')}
                        >
                            List
                        </button>
                    </div>
                    <Link to="/projects/new" className="create-project-btn">
                        Create Project
                    </Link>
                </div>
            </div>

            {projects.length === 0 ? (
                <div className="no-projects">
                    <p>No projects found. Create your first project to get started!</p>
                    <Link to="/projects/new" className="create-project-btn">
                        Create Project
                    </Link>
                </div>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="projects" direction={viewMode === 'grid' ? 'horizontal' : 'vertical'}>
                        {(provided) => (
                            <div 
                                className={`projects-container ${viewMode}`}
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                            >
                                {projects.map((project, index) => (
                                    <Draggable 
                                        key={project.draggableId}
                                        draggableId={project.draggableId}
                                        index={index}
                                    >
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`project-card ${snapshot.isDragging ? 'dragging' : ''}`}
                                            >
                                                <div 
                                                    className="drag-handle"
                                                    {...provided.dragHandleProps}
                                                >
                                                    <span className="drag-icon">⋮</span>
                                                </div>
                                                <Link 
                                                    to={`/projects/${project.project_id}`}
                                                    className="project-link"
                                                >
                                                    <div className="project-header">
                                                        <div className="project-icon">
                                                            {project.project_name.charAt(0)}
                                                        </div>
                                                        <h3>{project.project_name}</h3>
                                                    </div>
                                                    <div className="project-content">
                                                        <div className="project-info">
                                                            <div className="info-item">
                                                                <span className="label">Description</span>
                                                                <span className="value">{project.project_description}</span>
                                                            </div>
                                                            <div className="info-item">
                                                                <span className="label">Owner</span>
                                                                <span className="value">{project.owner_id}</span>
                                                            </div>
                                                            <div className="info-item">
                                                                <span className="label">Members</span>
                                                                <span className="value">{project.members.length} members</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                                <div className="project-actions">
                                                    <button
                                                        className="action-btn delete"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleDelete(project.project_id);
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            )}
        </div>
    );
};

export default ProjectsList; 