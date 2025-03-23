import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../../services/projectService';
import './CreateProject.css';

const CreateProject = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        project_name: '',
        project_description: '',
        owner_id: '1' // This should come from your authentication system
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

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
            const response = await projectService.createProject(formData);
            if (response && response.project_id) {
                navigate(`/projects/${response.project_id}`);
            }
        } catch (err) {
            console.error('Error creating project:', err);
            setError('Failed to create project. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-project-container">
            <div className="create-project-header">
                <h1>Create New Project</h1>
                <button 
                    className="cancel-btn"
                    onClick={() => navigate('/projects')}
                >
                    Cancel
                </button>
            </div>

            <form onSubmit={handleSubmit} className="create-project-form">
                {error && <div className="error-message">{error}</div>}
                
                <div className="form-group">
                    <label htmlFor="project_name">Project Name</label>
                    <input
                        type="text"
                        id="project_name"
                        name="project_name"
                        value={formData.project_name}
                        onChange={handleChange}
                        required
                        placeholder="Enter project name"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="project_description">Project Description</label>
                    <textarea
                        id="project_description"
                        name="project_description"
                        value={formData.project_description}
                        onChange={handleChange}
                        placeholder="Enter project description"
                        rows="4"
                    />
                </div>

                <div className="form-actions">
                    <button 
                        type="submit" 
                        className="submit-btn"
                        disabled={loading}
                    >
                        {loading ? 'Creating...' : 'Create Project'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateProject; 