import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, ArrowLeft, KeyRound, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/auth.service';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import GoogleSignInButton from '../../components/GoogleSignInButton';


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

    // OTP verification states
    const [requiresOtp, setRequiresOtp] = useState(false);
    const [otpEmail, setOtpEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
            toast.error('Sila masukkan kod OTP 6-digit yang sah.');
            return;
        }

        setIsVerifying(true);
        try {
            const response = await authService.verifySignupOtp({
                email: otpEmail,
                otp
            });

            login(response.token, response.user, 'user');
            
            // For Google Auth cases where profile is incomplete
            if (response.redirect_to_profile || response.profile_complete === false || (response.user.ic_number && response.user.ic_number.startsWith('G-'))) {
                toast.success('Pengesahan berjaya! Sila lengkapkan profil anda.');
                navigate('/lengkapkan-profil', { replace: true });
            } else {
                toast.success(response.message || 'Log masuk berjaya!');
                navigate('/users/dashboard', { replace: true });
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Kod OTP tidak sah atau telah tamat tempoh');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResendOtp = async () => {
        if (cooldown > 0) return;
        try {
            await authService.resendSignupOtp({ email: otpEmail });
            toast.success('Kod OTP baharu telah dihantar ke e-mel anda.');
            setCooldown(60);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal menghantar semula kod OTP.');
        }
    };

    const handleBackToLogin = () => {
        setRequiresOtp(false);
        setOtp('');
    };

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

    const handleGoogleSuccess = async (credential: string) => {
        setIsGoogleLoading(true);
        try {
            const response = await authService.googleAuth({
                credential, // direct JWT token from Google Console
                intent: 'login',
            });

            if (response.requires_otp) {
                toast.success(response.message || 'Sila sahkan e-mel anda menggunakan kod OTP.');
                setOtpEmail(response.email);
                setRequiresOtp(true);
                setCooldown(60);
                return;
            }

            login(response.token, response.user, 'user');
            
            if (response.redirect_to_profile || response.profile_complete === false) {
                toast.success('Log masuk berjaya! Sila lengkapkan profil anda.');
                navigate('/lengkapkan-profil', { replace: true });
            } else {
                toast.success(t('login.success'));
                navigate('/users/dashboard', { replace: true });
            }
        } catch (error: any) {
            const errorData = error.response?.data;
            if (errorData?.redirect_to_register) {
                toast.error(errorData.error || 'Akaun tidak ditemui. Sila Sign Up.');
                navigate('/users/register', { replace: true });
            } else {
                toast.error(errorData?.error || t('login.failed'));
            }
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
                    {!requiresOtp ? (
                        <>
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
                                onSuccess={handleGoogleSuccess}
                                disabled={isLoading || isGoogleLoading}
                                disabledLabel={t('common.loading')}
                                unavailableLabel={t('user_auth.google_unavailable')}
                                isConfigured={!!import.meta.env.VITE_GOOGLE_CLIENT_ID}
                            />

                            {/* Register link */}
                            <p className="text-center text-gray-500 mt-6">
                                {t('user_login.no_account')}{' '}
                                <Link to="/users/register" className="text-primary-600 hover:text-primary-700 font-medium">
                                    {t('user_login.register_now')}
                                </Link>
                            </p>
                        </>
                    ) : (
                        // OTP Verification View
                        <div className="text-center animate-fade-in">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <KeyRound className="w-8 h-8 text-white animate-pulse" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">Sahkan E-mel Anda</h2>
                            <p className="text-gray-500 mt-2">
                                Kami telah menghantar kod OTP 6-digit ke alamat e-mel:
                            </p>
                            <div className="flex items-center justify-center gap-2 mt-2 font-semibold text-gray-700 bg-gray-50 py-2 px-4 rounded-lg inline-flex mx-auto">
                                <Mail className="w-4 h-4 text-primary-600" />
                                <span>{otpEmail}</span>
                            </div>

                            <form onSubmit={handleVerifyOtp} className="mt-8 space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Kod OTP 6-Digit
                                    </label>
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        className="text-center tracking-[1em] text-2xl font-bold input-field py-3"
                                        maxLength={6}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isVerifying || otp.length !== 6}
                                    className="btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    {isVerifying ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>Sahkan Kod OTP</>
                                    )}
                                </button>
                            </form>

                            <div className="mt-6 flex flex-col items-center gap-3">
                                <button
                                    onClick={handleResendOtp}
                                    disabled={cooldown > 0}
                                    className="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:text-gray-400 flex items-center gap-2 transition-colors"
                                >
                                    <RefreshCw className={`w-4 h-4 ${cooldown === 0 ? 'hover:rotate-180 transition-transform duration-500' : ''}`} />
                                    {cooldown > 0 ? `Hantar semula dalam ${cooldown}s` : 'Hantar Semula Kod OTP'}
                                </button>
                                
                                <button
                                    onClick={handleBackToLogin}
                                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mt-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Kembali ke Log Masuk
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="text-center text-sm text-white/60 mt-8">
                    {t('login.footer')}
                </footer>
            </div>

        </div>
    );
}
