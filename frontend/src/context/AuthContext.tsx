import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser } from '../types';
import authService from '../services/auth.service';
import i18n from '../i18n';

interface AuthContextType {
    user: AuthUser | null;
    role: string | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, user: AuthUser, role: string) => void;
    logout: () => void;
    updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for stored auth on mount
        const { token: storedToken, user: storedUser, role: storedRole } = authService.getStoredAuth();

        if (storedToken && storedUser && storedRole) {
            setToken(storedToken);
            setUser(storedUser);
            setRole(storedRole);

            // Load user language preference
            const storedLang = localStorage.getItem(`lang_${storedUser.id}`);
            if (storedLang) {
                i18n.changeLanguage(storedLang);
            }
        }

        setIsLoading(false);
    }, []);

    const login = (newToken: string, newUser: AuthUser, newRole: string) => {
        authService.setAuth(newToken, newUser, newRole);
        setToken(newToken);
        setUser(newUser);
        setRole(newRole);

        // Load user language preference
        const storedLang = localStorage.getItem(`lang_${newUser.id}`);
        if (storedLang) {
            i18n.changeLanguage(storedLang);
        } else {
            // Default to 'ms' if no preference set for this user? 
            // Or keep current. Keeping current is better for UX if they changed it before login.
            // But to decouple Admin vs User on same PC:
            // If I am Admin (En) and log out. User logs in (New). User gets En.
            // User wants BM. They set BM. It saves.
            // Next time User logs in, they get BM.
            // Next time Admin logs in, they get En.
            // This works.
        }

        // Allow welcome popup to show again for new login session
        sessionStorage.removeItem('welcomeShown');
    };

    const logout = () => {
        authService.logout();
        setToken(null);
        setUser(null);
        setRole(null);
    };

    const updateUser = (updatedUser: AuthUser) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    const value = {
        user,
        role,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        updateUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
