import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/auth.service';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import { isSupabaseAuthConfigured, supabaseAuth } from '../../config/supabase';

export default function UserLogin() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        ic_number: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.ic_number || !formData.password) {
            toast.error(t('user_login.error_ic_required'));
            return;
        }

        if (formData.ic_number.length !== 12) {
            toast.error(t('user_login.error_ic_format'));
            return;
        }

        setIsLoading(true);
        try {
            const response = await authService.login({
                ic_number: formData.ic_number,
                password: formData.password,
                role: 'user',
            });

            login(response.token, response.user, 'user');
            toast.success(t('login.success'));
            navigate('/users/dashboard');
        } catch (error: any) {
            toast.error(error.response?.data?.error || t('login.failed'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleOAuth = async () => {
        if (!supabaseAuth) {
            toast.error(t('user_auth.google_unavailable'));
            return;
        }

        setIsGoogleLoading(true);
        try {
            const { error } = await supabaseAuth.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?intent=login`,
                    queryParams: {
                        prompt: 'select_account',
                    },
                },
            });

            if (error) {
                toast.error(error.message || t('login.failed'));
            }
        } catch (error: any) {
            toast.error(error?.message || t('login.failed'));
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-primary-900 flex items-center justify-center px-4 relative">
            <div className="absolute top-4 right-4 z-10">
                <LanguageSwitcher className="text-white hover:bg-white/10" />
            </div>

            <div className="w-full max-w-md">
                {/* Back button */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('login.back')}
                </Link>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <LogIn className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800">{t('user_login.title')}</h1>
                        <p className="text-gray-500 mt-1">{t('user_login.subtitle')}</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('user_login.ic_no')}
                            </label>
                            <input
                                type="text"
                                value={formData.ic_number}
                                onChange={(e) => setFormData({ ...formData, ic_number: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                                placeholder={t('user_login.placeholder_ic')}
                                className="input-field"
                                maxLength={12}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('login.password')}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder={t('login.placeholder_password')}
                                    className="input-field pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Link to="/users/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
                                {t('user_login.forgot_password')}
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || isGoogleLoading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    {t('login.submit')}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="flex items-center gap-3 my-6">
                        <div className="h-px bg-gray-200 flex-1" />
                        <span className="text-xs font-medium text-gray-400 uppercase">{t('user_auth.or_google')}</span>
                        <div className="h-px bg-gray-200 flex-1" />
                    </div>

                    <GoogleSignInButton
                        text="signin_with"
                        onClick={handleGoogleOAuth}
                        disabled={isLoading || isGoogleLoading}
                        disabledLabel={t('common.loading')}
                        unavailableLabel={t('user_auth.google_unavailable')}
                        isConfigured={isSupabaseAuthConfigured}
                    />

                    {/* Register link */}
                    <p className="text-center text-gray-500 mt-6">
                        {t('user_login.no_account')}{' '}
                        <Link to="/users/register" className="text-primary-600 hover:text-primary-700 font-medium">
                            {t('user_login.register_now')}
                        </Link>
                    </p>
                </div>

                {/* Footer */}
                <footer className="text-center text-sm text-white/60 mt-8">
                    {t('login.footer')}
                </footer>
            </div>

        </div>
    );
}
