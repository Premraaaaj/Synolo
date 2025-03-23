import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../../services/projectService';
import './CreateProject.css';

const CreateProject = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        project_name: '',
        project_description: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Check if user is authenticated
        const userData = localStorage.getItem('user');
        if (!userData) {
            setError('Please log in to create a project');
            navigate('/login');
            return;
        }
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        setSuccess(false);

        try {
            if (!formData.project_name.trim()) {
                throw new Error('Project name is required');
            }

            const project = await projectService.createProject(formData);
            console.log('Project created:', project);
            setSuccess(true);

            // Redirect to the new project page after a short delay
            setTimeout(() => {
                navigate(`/project/${project.project_id}`);
            }, 1500);
        } catch (err) {
            console.error('Error creating project:', err);
            setError(err.message || 'Failed to create project');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-project-container">
            <div className="create-project-form">
                <h2>Create New Project</h2>
                {error && <div className="error-message">{error}</div>}
                {success && (
                    <div className="success-message">
                        Project created successfully! Redirecting...
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="project_name">Project Name</label>
                        <input
                            type="text"
                            id="project_name"
                            name="project_name"
                            value={formData.project_name}
                            onChange={handleChange}
                            disabled={loading}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="project_description">Description</label>
                        <textarea
                            id="project_description"
                            name="project_description"
                            value={formData.project_description}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>
                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={() => navigate('/projects')}
                            className="cancel-btn"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={loading || !formData.project_name.trim()}
                        >
                            {loading ? 'Creating...' : 'Create Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProject; 