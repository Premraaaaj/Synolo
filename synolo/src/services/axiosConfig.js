import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'http://localhost:5000',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        // Get user data from localStorage
        const userData = localStorage.getItem('user');
        console.log('User data in axios interceptor:', userData);
        
        if (userData) {
            try {
                const user = JSON.parse(userData);
                const userId = user.user_id || user.id || user._id;
                console.log('Setting X-User-ID header:', userId);
                
                if (userId) {
                    config.headers['X-User-ID'] = userId;
                }
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        }

        console.log('Request config:', {
            url: config.url,
            headers: config.headers,
            data: config.data
        });
        return config;
    },
    (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor
axiosInstance.interceptors.response.use(
    (response) => {
        console.log('Response:', {
            status: response.status,
            data: response.data
        });
        return response;
    },
    (error) => {
        console.error('Response error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        return Promise.reject(error);
    }
);

export default axiosInstance; 