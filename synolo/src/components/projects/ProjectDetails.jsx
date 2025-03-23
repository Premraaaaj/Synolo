import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService } from '../../services/projectService';
import ProjectBacklog from './ProjectBacklog';
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
    const [successMessage, setSuccessMessage] = useState(null);
    const [showBacklog, setShowBacklog] = useState(false);

    useEffect(() => {
        fetchProjectData();
    }, [projectId]);

    const fetchProjectData = async () => {
        try {
            setLoading(true);
            // Fetch project details
            const projectData = await projectService.getProject(projectId);
            setProject(projectData);
            // console.log('Project data:------------------------------', projectData);

            // Fetch project tasks
            const tasksResponse = await projectService.getProjectTasks(projectId);
            
                if (tasksResponse && tasksResponse) {
                    setTasks(tasksResponse);
                } else {
                    
                    setTasks([]);
                }
                // console.log('Tasks after fetching:++++++++++++++++++++++++', tasksResponse);
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
            setLoading(true);
            setError(null);
            
            // Get current user from localStorage
            const userData = localStorage.getItem('user');
            if (!userData) {
                throw new Error('User not authenticated');
            }

            const user = JSON.parse(userData);
            const userId = user.user_id || user.id || user._id;
            if (!userId) {
                throw new Error('Invalid user ID');
            }

            // Create task data
            const taskData = {
                task_name: newTask.task_name,
                description: newTask.description || '',
                assigned_to: newTask.assigned_to,
                status: 'pending',
                issued_date: new Date().toISOString(),
                project_id: projectId
            };

            console.log('Creating task with data:', taskData);
            
            // Create the task
            await projectService.createTask(projectId, taskData);
            
            // Fetch updated tasks
            const tasksResponse = await projectService.getProjectTasks(projectId);
            console.log('Tasks response after creation:', tasksResponse);
            
            // Update tasks state with the new data
            if (Array.isArray(tasksResponse)) {
                setTasks(tasksResponse);
            } else if (tasksResponse && Array.isArray(tasksResponse.tasks)) {
                setTasks(tasksResponse.tasks);
            } else {
                console.error('Invalid tasks data structure:', tasksResponse);
                throw new Error('Invalid response format from server');
            }

            // Reset form and close modal
            setNewTask({
                task_name: '',
                description: '',
                assigned_to: '',
                status: 'pending'
            });
            setShowCreateTaskModal(false);
            
            // Show success message
            setSuccessMessage('Task created successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
            
        } catch (err) {
            console.error('Error creating task:', err);
            setError('Failed to create task. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('Deleting task:', { projectId, taskId });
            
            // Delete the task and get updated tasks list
            const response = await projectService.deleteTask(projectId, taskId);
            console.log('Delete task response:', response);
            
            // Update tasks state with the new data
            if (response && Array.isArray(response.tasks)) {
                setTasks(response.tasks);
            } else {
                console.error('Invalid tasks data structure:', response);
                throw new Error('Invalid response format from server');
            }

            // Reset deletion confirmation state
            setShowDeleteConfirm(false);
            setTaskToDelete(null);
            
            // Show success message
            setSuccessMessage('Task deleted successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
            
        } catch (err) {
            console.error('Error deleting task:', err);
            setError('Failed to delete task. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('Updating task status:', { taskId, newStatus, projectId });
            
            // Update the task status
            await projectService.updateTaskStatus(projectId, taskId, newStatus);
            
            // Fetch updated tasks
            const tasksResponse = await projectService.getProjectTasks(projectId);
            console.log('Tasks response after status update:', tasksResponse);
            
            // Update tasks state with the new data
            if (Array.isArray(tasksResponse)) {
                setTasks(tasksResponse);
            } else if (tasksResponse && Array.isArray(tasksResponse.tasks)) {
                setTasks(tasksResponse.tasks);
            } else {
                console.error('Invalid tasks data structure:', tasksResponse);
                throw new Error('Invalid response format from server');
            }

            // Reset editing state
            setEditingTaskId(null);
            
            // Show success message
            setSuccessMessage('Task status updated successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
            
        } catch (err) {
            console.error('Error updating task status:', err);
            setError('Failed to update task status. Please try again.');
        } finally {
            setLoading(false);
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
                <div className="header-content">
                    <h1>{project.project_name}</h1>
                    <div className="header-actions">
                        <button 
                            className="backlog-btn"
                            onClick={() => setShowBacklog(true)}
                        >
                            View Backlog
                        </button>
                        <button 
                            className="create-task-btn"
                            onClick={() => setShowCreateTaskModal(true)}
                        >
                            + Create Task
                        </button>
                    </div>
                </div>
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

            {showBacklog && (
                <ProjectBacklog 
                    projectId={projectId} 
                    onClose={() => setShowBacklog(false)} 
                />
            )}
        </div>
    );
};

export default ProjectDetails;