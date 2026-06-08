import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/auth.service';

/**
 * Extract access_token directly from the URL hash fragment.
 * Supabase implicit flow returns: #access_token=xxx&refresh_token=yyy&...
 * We only need the access_token to send to our backend for verification.
 *
 * NOTE: detectSessionInUrl is set to false in supabase.ts so that
 * Supabase does NOT auto-consume the hash before we can read it.
 */
const getAccessTokenFromHash = (): string | null => {
    const hash = window.location.hash.substring(1); // remove leading #
    if (!hash) return null;

    const params = new URLSearchParams(hash);
    return params.get('access_token') || null;
};

export default function AuthCallback() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { login } = useAuth();
    const [searchParams] = useSearchParams();
    const [statusText, setStatusText] = useState('Mengesahkan akaun Google...');

    // Prevent React StrictMode from running the callback twice
    const hasProcessed = useRef(false);
    // Capture token immediately on first render (before StrictMode re-render clears hash)
    const capturedToken = useRef<string | null>(getAccessTokenFromHash());

    const intent = (searchParams.get('intent') || 'login') as 'login' | 'register';

    useEffect(() => {
        // Guard: Only process once (React StrictMode calls useEffect twice)
        if (hasProcessed.current) return;
        hasProcessed.current = true;

        const accessToken = capturedToken.current;
        console.log('[AuthCallback] Intent:', intent, '| Token found:', !!accessToken);

        if (!accessToken) {
            toast.error('Sesi Google tidak sah. Sila cuba lagi.');
            navigate(intent === 'register' ? '/users/register' : '/users', { replace: true });
            return;
        }

        // Clean the URL hash so it doesn't linger
        window.history.replaceState(null, '', window.location.pathname + window.location.search);

        const processCallback = async () => {
            setStatusText(intent === 'register' ? 'Mendaftarkan akaun...' : 'Log masuk...');

            try {
                const response = await authService.googleAuth({
                    supabase_access_token: accessToken,
                    intent,
                });

                // Login the user with our own JWT
                login(response.token, response.user, 'user');

                // Sign Up: redirect to profile completion if profile is incomplete
                // Sign In: always go straight to dashboard
                if (intent === 'register' && (response.redirect_to_profile || response.profile_complete === false)) {
                    toast.success('Akaun berjaya didaftar! Sila lengkapkan profil anda.');
                    navigate('/lengkapkan-profil', { replace: true });
                } else {
                    toast.success(intent === 'register' ? t('user_auth.success_register') : t('login.success'));
                    navigate('/users/dashboard', { replace: true });
                }
            } catch (error: any) {
                const errorData = error.response?.data;

                // Handle redirect_to_login (user already exists, tried to register)
                if (errorData?.redirect_to_login) {
                    toast.error(errorData.error || 'Akaun email ini sudah didaftarkan. Sila Log In.');
                    navigate('/users', { replace: true });
                    return;
                }

                // Handle redirect_to_register (user not found, tried to login)
                if (errorData?.redirect_to_register) {
                    toast.error(errorData.error || 'Akaun tidak ditemui. Sila Sign Up.');
                    navigate('/users/register', { replace: true });
                    return;
                }

                // Generic error
                toast.error(errorData?.error || t('common.error_load'));
                navigate(intent === 'register' ? '/users/register' : '/users', { replace: true });
            }
        };

        processCallback();
    }, [intent, login, navigate, t]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-primary-900 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-medium">{statusText}</p>
                <p className="text-gray-400 text-sm mt-2">Sila tunggu sebentar...</p>
            </div>
        </div>
    );
}
