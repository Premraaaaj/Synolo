import React, { useState, useEffect } from 'react';
import { projectService } from '../../services/projectService';
import './ProjectBacklog.css';

const ProjectBacklog = ({ projectId, onClose }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchProjectTasks();
    }, [projectId]);

    const fetchProjectTasks = async () => {
        try {
            setLoading(true);
            setError(null);
            const tasksResponse = await projectService.getProjectTasks(projectId);
            if (Array.isArray(tasksResponse)) {
                setTasks(tasksResponse);
            } else if (tasksResponse && Array.isArray(tasksResponse.tasks)) {
                setTasks(tasksResponse.tasks);
            } else {
                setTasks([]);
            }
        } catch (err) {
            console.error('Error fetching project tasks:', err);
            setError('Failed to load project tasks');
        } finally {
            setLoading(false);
        }
    };

    const getTasksByStatus = (status) => {
        return tasks.filter(task => task.status === status);
    };

    if (loading) return <div className="backlog-loading">Loading backlog...</div>;
    if (error) return <div className="backlog-error">{error}</div>;

    return (
        <div className="project-backlog">
            <div className="backlog-header">
                <h2>Project Backlog</h2>
                <button className="close-button" onClick={onClose}>×</button>
            </div>
            
            <div className="backlog-content">
                <div className="backlog-column">
                    <h3>Pending Tasks</h3>
                    <div className="task-list">
                        {getTasksByStatus('pending').map((task) => (
                            <div key={task.task_id} className="task-card">
                                <h4>{task.task_name}</h4>
                                <div className="task-meta">
                                    <span>Assigned: {task.assigned_to}</span>
                                    <span>Issued: {new Date(task.issued_date).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="backlog-column">
                    <h3>In Progress Tasks</h3>
                    <div className="task-list">
                        {getTasksByStatus('in_progress').map((task) => (
                            <div key={task.task_id} className="task-card">
                                <h4>{task.task_name}</h4>
                                <div className="task-meta">
                                    <span>Assigned: {task.assigned_to}</span>
                                    <span>Issued: {new Date(task.issued_date).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectBacklog; 