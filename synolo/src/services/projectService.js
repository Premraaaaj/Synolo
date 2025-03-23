import axiosInstance from './axiosConfig';

export const projectService = {
    // Get all projects
    getAllProjects: async () => {
        try {
            // Get user data from localStorage
            const userData = localStorage.getItem('user');
            console.log('User data in projectService:', userData);
            
            if (!userData) {
                throw new Error('User not authenticated');
            }

            const user = JSON.parse(userData);
            const userId = user.user_id || user.id || user._id;
            console.log('User ID:', userId);
            
            if (!userId) {
                throw new Error('Invalid user data');
            }

            console.log('Making request to /api/projects');
            const response = await axiosInstance.get('/api/projects');
            console.log('Raw response:', response);
            
            if (!response.data) {
                console.error('No data in response');
                throw new Error('Invalid response format from server');
            }

            console.log('Response data:', response.data);
            
            // Handle both possible response formats
            let projects;
            if (Array.isArray(response.data)) {
                projects = response.data;
            } else if (response.data.projects && Array.isArray(response.data.projects)) {
                projects = response.data.projects;
            } else {
                console.error('Invalid projects data structure:', response.data);
                throw new Error('Invalid response format from server');
            }

            // Ensure each project has the required fields
            projects = projects.map(project => ({
                project_id: project.project_id || project._id,
                project_name: project.project_name || 'Untitled Project',
                project_description: project.project_description || '',
                status: project.status || 'Active',
                created_at: project.created_at || new Date().toISOString(),
                owner_id: project.owner_id,
                members: project.members || [],
                tasks: project.tasks || []
            }));

            console.log('Processed projects:', projects);
            return projects;
        } catch (error) {
            console.error('Error in getAllProjects:', error);
            if (error.response) {
                console.error('Server response:', error.response.data);
                throw new Error(error.response.data.error || 'Failed to fetch projects');
            }
            throw new Error('Network error while fetching projects');
        }
    },

    // Get a single project
    getProject: async (projectId) => {
        try {
            const response = await axiosInstance.get(`/api/projects/${projectId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching project:', error);
            if (error.response) {
                throw new Error(error.response.data.error || 'Failed to fetch project');
            }
            throw new Error('Network error while fetching project');
        }
    },

    // Get tasks for a project
    getProjectTasks: async (projectId) => {
        try {
            const response = await axiosInstance.get(`/api/projects/${projectId}/tasks`);
            if (!response.data || !response.data.tasks) {
                throw new Error('Invalid response format from server');
            }
            return response.data.tasks;
        } catch (error) {
            console.error('Error fetching project tasks:', error);
            if (error.response) {
                throw new Error(error.response.data.error || 'Failed to fetch project tasks');
            }
            throw new Error('Network error while fetching project tasks');
        }
    },

    // Create a new project
    createProject: async (projectData) => {
        try {
            const userData = localStorage.getItem('user');
            if (!userData) {
                throw new Error('User not authenticated');
            }

            const user = JSON.parse(userData);
            const userId = user.user_id || user.id || user._id;
            if (!userId) {
                throw new Error('Invalid user data');
            }

            if (!projectData.project_name) {
                throw new Error('Project name is required');
            }

            // Match the backend schema exactly
            const projectPayload = {
                project_name: projectData.project_name,
                project_description: projectData.project_description || '',
                tasks: [],
                members: [userId],
                owner_id: userId
            };

            console.log('Creating project with payload:', projectPayload);

            const response = await axiosInstance.post('/api/projects', projectPayload);
            console.log('Create project response:', response);

            if (!response.data || !response.data.project_id) {
                throw new Error('Invalid response format from server');
            }

            // Return the project data in the same format as the backend
            return {
                project_id: response.data.project_id,
                project_name: projectPayload.project_name,
                project_description: projectPayload.project_description,
                tasks: projectPayload.tasks,
                members: projectPayload.members,
                owner_id: projectPayload.owner_id
            };
        } catch (error) {
            console.error('Error creating project:', error);
            if (error.response) {
                throw new Error(error.response.data.error || 'Failed to create project');
            }
            throw new Error('Network error while creating project');
        }
    },

    // Update project details
    updateProject: async (projectId, projectData) => {
        try {
            const response = await axiosInstance.put(`/api/projects/${projectId}`, projectData);
            return response.data;
        } catch (error) {
            console.error('Error updating project:', error);
            if (error.response) {
                throw new Error(error.response.data.error || 'Failed to update project');
            }
            throw new Error('Network error while updating project');
        }
    },

    // Delete a project
    deleteProject: async (projectId) => {
        try {
            const response = await axiosInstance.delete(`/api/projects/${projectId}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting project:', error);
            if (error.response) {
                throw new Error(error.response.data.error || 'Failed to delete project');
            }
            throw new Error('Network error while deleting project');
        }
    },

    // Get project details
    getProjectDetails: async (projectId) => {
        try {
            const response = await axiosInstance.get(`/api/projects/${projectId}`);
            if (!response.data) {
                throw new Error('Invalid response format from server');
            }
            return response.data;
        } catch (error) {
            console.error('Error fetching project details:', error);
            if (error.response) {
                throw new Error(error.response.data.error || 'Failed to fetch project details');
            }
            throw new Error('Network error while fetching project details');
        }
    },

    // Create a new task
    createTask: async (projectId, taskData) => {
        try {
            if (!taskData.task_name || !taskData.assigned_to) {
                throw new Error('Task name and assignee are required');
            }

            const response = await axiosInstance.post(`/api/projects/${projectId}/tasks`, {
                task_name: taskData.task_name,
                assigned_to: taskData.assigned_to,
                status: taskData.status || 'pending'
            });

            if (!response.data || !response.data.task_id) {
                throw new Error('Invalid response format from server');
            }

            return {
                task_id: response.data.task_id,
                task_name: taskData.task_name,
                assigned_to: taskData.assigned_to,
                status: taskData.status || 'pending',
                project_id: projectId
            };
        } catch (error) {
            console.error('Error creating task:', error);
            if (error.response) {
                throw new Error(error.response.data.error || 'Failed to create task');
            }
            throw new Error('Network error while creating task');
        }
    },

    // Update task status
    updateTaskStatus: async (taskId, status) => {
        try {
            const response = await axiosInstance.put(`/api/tasks/${taskId}`, { status });
            return response.data;
        } catch (error) {
            console.error('Error updating task status:', error);
            if (error.response) {
                throw new Error(error.response.data.error || 'Failed to update task status');
            }
            throw new Error('Network error while updating task status');
        }
    },

    // Delete a task
    deleteTask: async (projectId, taskId) => {
        try {
            const response = await axiosInstance.delete(`/api/tasks/${taskId}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting task:', error);
            if (error.response) {
                throw new Error(error.response.data.error || 'Failed to delete task');
            }
            throw new Error('Network error while deleting task');
        }
    }
}; 