import React, { useState, useEffect } from 'react';
import { projectService } from '../../services/projectService';
import './Backlog.css';

const Backlog = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all', 'pending', 'in_progress', 'completed'

    useEffect(() => {
        fetchUserTasks();
    }, []);

    const fetchUserTasks = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Get current user from localStorage
            const userData = localStorage.getItem('user');
            console.log('User data in Backlog:', userData);
            
            if (!userData) {
                throw new Error('User not authenticated');
            }

            const user = JSON.parse(userData);
            console.log('Parsed user data:', user);
            
            const userId = user.user_id || user.id || user._id;
            console.log('User ID in Backlog:', userId);

            if (!userId) {
                throw new Error('Invalid user ID');
            }

            // Get all projects first
            const projects = await projectService.getAllProjects();
            console.log('Projects:', projects);

            // Get tasks from all projects
            const allTasks = [];
            for (const project of projects) {
                try {
                    const projectId = project.project_id || project._id;
                    console.log(`Fetching tasks for project ${projectId}`);
                    
                    const tasksResponse = await projectService.getProjectTasks(projectId);
                    console.log(`Tasks for project ${projectId}:`, tasksResponse);
                    
                    if (Array.isArray(tasksResponse)) {
                        // Filter tasks assigned to current user
                        const userTasks = tasksResponse.filter(task => task.assigned_to === userId);
                        console.log(`Found ${userTasks.length} tasks for user in project ${projectId}`);
                        
                        // Add project name to each task
                        allTasks.push(...userTasks.map(task => ({
                            ...task,
                            project_name: project.project_name,
                            project_id: projectId
                        })));
                    }
                } catch (error) {
                    console.error(`Error fetching tasks for project ${project.project_id}:`, error);
                }
            }

            console.log('All tasks for user:', allTasks);
            setTasks(allTasks);
        } catch (err) {
            console.error('Error fetching user tasks:', err);
            setError('Failed to load tasks. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            setLoading(true);
            console.log('Updating task status:', { taskId, newStatus });
            await projectService.updateTaskStatus(null, taskId, newStatus);
            await fetchUserTasks(); // Refresh tasks after status update
        } catch (err) {
            console.error('Error updating task status:', err);
            setError('Failed to update task status. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'all') return true;
        return task.status === filter;
    });

    if (loading) return <div className="backlog-loading">Loading tasks...</div>;
    if (error) return <div className="backlog-error">{error}</div>;

    return (
        <div className="backlog-container">
            <div className="backlog-header">
                <h1>My Backlog</h1>
                <div className="backlog-filters">
                    <button 
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All Tasks
                    </button>
                    <button 
                        className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                        onClick={() => setFilter('pending')}
                    >
                        Pending
                    </button>
                    <button 
                        className={`filter-btn ${filter === 'in_progress' ? 'active' : ''}`}
                        onClick={() => setFilter('in_progress')}
                    >
                        In Progress
                    </button>
                    <button 
                        className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
                        onClick={() => setFilter('completed')}
                    >
                        Completed
                    </button>
                </div>
            </div>

            <div className="backlog-content">
                {filteredTasks.length === 0 ? (
                    <div className="no-tasks">
                        <p>No tasks found for the selected filter.</p>
                    </div>
                ) : (
                    <div className="tasks-grid">
                        {filteredTasks.map(task => (
                            <div key={task.task_id} className="task-card">
                                <div className="task-header">
                                    <h3>{task.task_name}</h3>
                                    <span className={`status-badge ${task.status}`}>
                                        {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                    </span>
                                </div>
                                <div className="task-details">
                                    <div className="task-meta">
                                        <span>Project: {task.project_name || 'Unknown Project'}</span>
                                        <span>Assigned To: {task.assigned_to}</span>
                                        <span>Issued: {new Date(task.issued_date).toLocaleDateString()}</span>
                                        {task.completion_date && (
                                            <span>Completed: {new Date(task.completion_date).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="task-actions">
                                    <select 
                                        value={task.status}
                                        onChange={(e) => handleStatusChange(task.task_id, e.target.value)}
                                        className="status-select"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Backlog; 