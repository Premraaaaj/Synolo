import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const projectService = {
    // Get all projects
    getAllProjects: async () => {
        try {
            const response = await axios.get(`${API_URL}/projects`);
            return response.data;
        } catch (error) {
            console.error('Error fetching projects:', error);
            throw error;
        }
    },

    // Get a single project
    getProject: async (projectId) => {
        try {
            const response = await axios.get(`${API_URL}/projects/${projectId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching project:', error);
            throw error;
        }
    },

    // Get tasks for a project
    getProjectTasks: async (projectId) => {
        try {
            const response = await axios.get(`${API_URL}/projects/${projectId}/tasks`);
            return response.data;
        } catch (error) {
            console.error('Error fetching project tasks:', error);
            throw error;
        }
    },

    // Create a new project
    createProject: async (projectData) => {
        try {
            const response = await axios.post(`${API_URL}/projects`, projectData);
            return response.data;
        } catch (error) {
            console.error('Error creating project:', error);
            throw error;
        }
    },

    // Update project details
    updateProject: async (projectId, projectData) => {
        try {
            const response = await axios.put(`${API_URL}/projects/${projectId}`, projectData);
            return response.data;
        } catch (error) {
            console.error('Error updating project:', error);
            throw error;
        }
    },

    // Delete a project
    deleteProject: async (projectId) => {
        try {
            await axios.delete(`${API_URL}/projects/${projectId}`);
            return true;
        } catch (error) {
            console.error('Error deleting project:', error);
            throw error;
        }
    },

    // Create a new task
    createTask: async (projectId, taskData) => {
        try {
            const response = await axios.post(`${API_URL}/projects/${projectId}/tasks`, taskData);
            return response.data;
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    },

    // Update task status
    updateTaskStatus: async (taskId, status) => {
        try {
            const response = await axios.put(`${API_URL}/tasks/${taskId}`, { status });
            return response.data;
        } catch (error) {
            console.error('Error updating task status:', error);
            throw error;
        }
    },

    // Delete a task
    deleteTask: async (taskId) => {
        try {
            await axios.delete(`${API_URL}/tasks/${taskId}`);
            return true;
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }
}; 