import axios from 'axios';

let API_URL = import.meta.env.VITE_API_URL || '/api';
if (API_URL === 'https://api.ptas.my') {
    API_URL = 'https://api.ptas.my/api';
}

const api = axios.create({
    baseURL: API_URL,
});

export const getFileUrl = (path: string | undefined | null) => {
    if (!path) return '';
    
    // Fix older database entries that might have the wrong domain saved
    if (path.includes('/uploads/')) {
        const uploadIndex = path.indexOf('/uploads/');
        path = path.substring(uploadIndex);
    }
    
    if (path.startsWith('http')) return path;
    const base = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
};

// Helper to get cookie (duplicated to avoid circular dependency)
function getCookie(name: string) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        let token = localStorage.getItem('token');
        if (!token) token = getCookie('token'); // Fallback to cookie

        if (token && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // If the token is invalid or expired
        if (error.response?.status === 401 || error.response?.status === 403) {
            // Check if the error is from the token validation (to avoid clearing on other 403s)
            const errorMsg = error.response?.data?.error;
            if (errorMsg === 'Invalid or expired token' || errorMsg === 'Authentication required' || errorMsg === 'Access token required') {
                // Clear the token so subsequent requests don't keep failing with it
                localStorage.removeItem('token');
                
                // If it's a background request like /notifications, we can just let it fail silently.
                // If it's a user action, the specific page (like RegisterComplaint) will catch the 401/403 and handle UI.
                
                // For a global redirect approach (if we are not actively filling a form):
                // We could dispatch an event or check current path, but for now just clear token
                // to stop infinite failing polling.
            }
        }
        return Promise.reject(error);
    }
);

export default api;
