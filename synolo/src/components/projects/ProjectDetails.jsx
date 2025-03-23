import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService } from '../../services/projectService';
import './ProjectDetails.css';

const ProjectDetails = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [newTask, setNewTask] = useState({
        task_name: '',
        assigned_to: '',
        status: 'pending'
    });
    const [editingTaskId, setEditingTaskId] = useState(null);

    useEffect(() => {
        fetchProjectData();
    }, [projectId]);

    const fetchProjectData = async () => {
        try {
            setLoading(true);
            // Fetch project details
            const projectData = await projectService.getProject(projectId);
            setProject(projectData);

            // Fetch project tasks
            const tasksResponse = await projectService.getProjectTasks(projectId);
            if (tasksResponse && tasksResponse.tasks) {
                setTasks(tasksResponse.tasks);
            } else {
                setTasks([]);
            }
        } catch (err) {
            console.error('Error fetching project data:', err);
            setError('Failed to load project data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            const response = await projectService.createTask(projectId, newTask);
            // Refresh tasks after creating a new one
            const tasksResponse = await projectService.getProjectTasks(projectId);
            if (tasksResponse && tasksResponse.tasks) {
                setTasks(tasksResponse.tasks);
            }
            setShowCreateTaskModal(false);
            setNewTask({ task_name: '', assigned_to: '', status: 'pending' });
        } catch (err) {
            console.error('Error creating task:', err);
            setError('Failed to create task');
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await projectService.deleteTask(taskId);
            // Refresh tasks after deletion
            const tasksResponse = await projectService.getProjectTasks(projectId);
            if (tasksResponse && tasksResponse.tasks) {
                setTasks(tasksResponse.tasks);
            }
            setShowDeleteConfirm(false);
            setTaskToDelete(null);
        } catch (err) {
            console.error('Error deleting task:', err);
            setError('Failed to delete task');
        }
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await projectService.updateTaskStatus(taskId, newStatus);
            // Refresh tasks after status update
            const tasksResponse = await projectService.getProjectTasks(projectId);
            if (tasksResponse && tasksResponse.tasks) {
                setTasks(tasksResponse.tasks);
            }
            setEditingTaskId(null);
        } catch (err) {
            console.error('Error updating task status:', err);
            setError('Failed to update task status');
        }
    };

    const getTasksByStatus = (status) => {
        return tasks.filter(task => task.status === status);
    };

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!project) return <div className="error">Project not found</div>;

    return (
        <div className="project-details">
            <div className="project-header">
                <button className="back-button" onClick={() => navigate('/projects')}>
                    ← Back to Projects
                </button>
                <h1>{project.project_name}</h1>
                <div className="project-meta">
                    <span className="project-id">ID: {project.project_id}</span>
                    <span className="project-owner">Owner: {project.owner_id}</span>
                </div>
            </div>

            <div className="project-description">
                <h2>Description</h2>
                <p>{project.project_description}</p>
            </div>

            <div className="kanban-header">
                <h2>Tasks</h2>
                <button 
                    className="create-task-btn"
                    onClick={() => setShowCreateTaskModal(true)}
                >
                    + Create Task
                </button>
            </div>

            <div className="kanban-board">
                <div className="kanban-column">
                    <h3>Pending</h3>
                    <div className="task-list">
                        {getTasksByStatus('pending').map((task) => (
                            <div key={task.task_id} className="task-card">
                                <div className="task-header">
                                    <h4>{task.task_name}</h4>
                                    <div className="task-actions">
                                        <div className="status-dropdown">
                                            <button 
                                                className="status-btn"
                                                onClick={() => setEditingTaskId(editingTaskId === task.task_id ? null : task.task_id)}
                                            >
                                                {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                            </button>
                                            {editingTaskId === task.task_id && (
                                                <div className="status-options">
                                                    <button onClick={() => handleStatusChange(task.task_id, 'pending')}>Pending</button>
                                                    <button onClick={() => handleStatusChange(task.task_id, 'in_progress')}>In Progress</button>
                                                    <button onClick={() => handleStatusChange(task.task_id, 'completed')}>Completed</button>
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            className="delete-task-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTaskToDelete(task);
                                                setShowDeleteConfirm(true);
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                                <div className="task-meta">
                                    <span>Assigned: {task.assigned_to}</span>
                                    <span>Issued: {new Date(task.issued_date).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="kanban-column">
                    <h3>In Progress</h3>
                    <div className="task-list">
                        {getTasksByStatus('in_progress').map((task) => (
                            <div key={task.task_id} className="task-card">
                                <div className="task-header">
                                    <h4>{task.task_name}</h4>
                                    <div className="task-actions">
                                        <div className="status-dropdown">
                                            <button 
                                                className="status-btn"
                                                onClick={() => setEditingTaskId(editingTaskId === task.task_id ? null : task.task_id)}
                                            >
                                                {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                            </button>
                                            {editingTaskId === task.task_id && (
                                                <div className="status-options">
                                                    <button onClick={() => handleStatusChange(task.task_id, 'pending')}>Pending</button>
                                                    <button onClick={() => handleStatusChange(task.task_id, 'in_progress')}>In Progress</button>
                                                    <button onClick={() => handleStatusChange(task.task_id, 'completed')}>Completed</button>
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            className="delete-task-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTaskToDelete(task);
                                                setShowDeleteConfirm(true);
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                                <div className="task-meta">
                                    <span>Assigned: {task.assigned_to}</span>
                                    <span>Issued: {new Date(task.issued_date).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="kanban-column">
                    <h3>Completed</h3>
                    <div className="task-list">
                        {getTasksByStatus('completed').map((task) => (
                            <div key={task.task_id} className="task-card">
                                <div className="task-header">
                                    <h4>{task.task_name}</h4>
                                    <div className="task-actions">
                                        <div className="status-dropdown">
                                            <button 
                                                className="status-btn"
                                                onClick={() => setEditingTaskId(editingTaskId === task.task_id ? null : task.task_id)}
                                            >
                                                {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                            </button>
                                            {editingTaskId === task.task_id && (
                                                <div className="status-options">
                                                    <button onClick={() => handleStatusChange(task.task_id, 'pending')}>Pending</button>
                                                    <button onClick={() => handleStatusChange(task.task_id, 'in_progress')}>In Progress</button>
                                                    <button onClick={() => handleStatusChange(task.task_id, 'completed')}>Completed</button>
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            className="delete-task-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTaskToDelete(task);
                                                setShowDeleteConfirm(true);
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                                <div className="task-meta">
                                    <span>Assigned: {task.assigned_to}</span>
                                    <span>Completed: {task.completion_date ? new Date(task.completion_date).toLocaleDateString() : 'N/A'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Create Task Modal */}
            {showCreateTaskModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Create New Task</h2>
                        <form onSubmit={handleCreateTask}>
                            <div className="form-group">
                                <label htmlFor="task_name">Task Name</label>
                                <input
                                    type="text"
                                    id="task_name"
                                    value={newTask.task_name}
                                    onChange={(e) => setNewTask({ ...newTask, task_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="assigned_to">Assign To</label>
                                <input
                                    type="text"
                                    id="assigned_to"
                                    value={newTask.assigned_to}
                                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowCreateTaskModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit">Create Task</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && taskToDelete && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Delete Task</h2>
                        <p className="delete-confirmation-text">
                            Are you sure you want to delete the task "{taskToDelete.task_name}"?
                            This action cannot be undone.
                        </p>
                        <div className="modal-actions">
                            <button type="button" onClick={() => {
                                setShowDeleteConfirm(false);
                                setTaskToDelete(null);
                            }}>
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className="delete-confirm-btn"
                                onClick={() => handleDeleteTask(taskToDelete.task_id)}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetails;