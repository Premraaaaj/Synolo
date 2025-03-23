import React, { useState, useEffect } from 'react';
import { projectService } from '../../services/projectService';
import './ProjectForm.css';

const ProjectForm = ({ projectId, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        status: 'Not Started',
        start_date: '',
        end_date: '',
        budget: '',
        priority: 'Medium'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (projectId) {
            loadProject();
        }
    }, [projectId]);

    const loadProject = async () => {
        try {
            const project = await projectService.getProject(projectId);
            setFormData({
                ...project,
                start_date: project.start_date.split('T')[0],
                end_date: project.end_date.split('T')[0]
            });
        } catch (err) {
            setError('Failed to load project details');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (projectId) {
                await projectService.updateProject(projectId, formData);
            } else {
                await projectService.createProject(formData);
            }
            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            setError('Failed to save project');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="project-form">
            <h2>{projectId ? 'Edit Project' : 'Create New Project'}</h2>
            {error && <div className="error">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="name">Project Name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        required
                    >
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Completed">Completed</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="priority">Priority</label>
                    <select
                        id="priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        required
                    >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="start_date">Start Date</label>
                    <input
                        type="date"
                        id="start_date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="end_date">End Date</label>
                    <input
                        type="date"
                        id="end_date"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="budget">Budget</label>
                    <input
                        type="number"
                        id="budget"
                        name="budget"
                        value={formData.budget}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-actions">
                    <button type="submit" disabled={loading}>
                        {loading ? 'Saving...' : (projectId ? 'Update Project' : 'Create Project')}
                    </button>
                    <button type="button" onClick={() => window.history.back()}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProjectForm; 