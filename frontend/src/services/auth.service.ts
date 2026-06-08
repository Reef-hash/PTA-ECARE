import api from './api';
import { LoginCredentials, RegisterData, GoogleAuthData, AuthUser } from '../types';

export const authService = {
    async login(credentials: LoginCredentials) {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },

    async register(data: RegisterData) {
        const response = await api.post('/auth/register', data);
        return response.data;
    },

    async googleAuth(data: GoogleAuthData) {
        const response = await api.post('/auth/google', data);
        return response.data;
    },

    async getProfile() {
        const response = await api.get('/auth/profile');
        return response.data;
    },

    async forgotPassword(data: { ic_number?: string; email?: string }) {
        const response = await api.post('/auth/forgot-password', data);
        return response.data;
    },

    async verifyOtp(data: { ic_number?: string; email?: string; otp: string }) {
        const response = await api.post('/auth/verify-otp', data);
        return response.data;
    },

    async resetPassword(data: { ic_number?: string; email?: string; otp: string; new_password: string }) {
        const response = await api.post('/auth/reset-password', data);
        return response.data;
    },

    async verifySignupOtp(data: { email: string; otp: string }) {
        const response = await api.post('/auth/verify-signup-otp', data);
        return response.data;
    },

    async resendSignupOtp(data: { email: string }) {
        const response = await api.post('/auth/resend-signup-otp', data);
        return response.data;
    },

    async verifyActivationOtp(data: { username: string; role: string; otp: string }) {
        const response = await api.post('/auth/verify-activation-otp', data);
        return response.data;
    },

    async resendActivationOtp(data: { username: string; role: string }) {
        const response = await api.post('/auth/resend-activation-otp', data);
        return response.data;
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
    },

    // Helper for cookies
    getCookie(name: string) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    },

    setCookie(name: string, value: string, days: number) {
        const expires = new Date();
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    },

    getStoredAuth(): { token: string | null; user: AuthUser | null; role: string | null } {
        let token = localStorage.getItem('token');
        let userStr = localStorage.getItem('user');
        let role = localStorage.getItem('role');

        // Fallback to cookies if localStorage empty
        if (!token) token = this.getCookie('token');
        if (!role) role = this.getCookie('role');
        if (!userStr) {
            const userCookie = this.getCookie('user');
            if (userCookie) userStr = decodeURIComponent(userCookie);
        }

        let user = null;
        if (userStr) {
            try {
                user = JSON.parse(userStr);
            } catch (e) {
                console.error('Failed to parse stored user');
            }
        }

        return { token, user, role };
    },

    setAuth(token: string, user: AuthUser, role: string) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('role', role);

        // Also set cookies as backup
        this.setCookie('token', token, 7);
        this.setCookie('role', role, 7);
        this.setCookie('user', encodeURIComponent(JSON.stringify(user)), 7);
    },
};

export default authService;
