import axios from 'axios';

let API_URL = import.meta.env.VITE_API_URL || '/api';
if (API_URL === 'https://api.ptas.my') {
    API_URL = 'https://api.ptas.my/api';
}

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const getFileUrl = (path: string | undefined | null) => {
    if (!path) return '';
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
        // DISABLE AUTO-LOGOUT FOR DEBUGGING
        // if (error.response?.status === 401) {
        //     console.error('API 401 Unauthorized - Preventing Auto-Logout for Debug');
        //     // Do NOT clear storage
        // }
        return Promise.reject(error);
    }
);

export default api;
