import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, ArrowLeft, KeyRound, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/auth.service';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default function AdminLogin() {
    const { login, isAuthenticated, role } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Login Form State
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // OTP Activation State
    const [pendingActivation, setPendingActivation] = useState<{
        email: string;
        username: string;
        role: 'admin' | 'technician';
    } | null>(null);
    const [otp, setOtp] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (isAuthenticated) {
            if (role === 'admin') {
                window.location.href = '/admin/dashboard';
            } else if (role === 'technician') {
                window.location.href = '/admin/technician/dashboard';
            }
        }
    }, [isAuthenticated, role]);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.username || !formData.password) {
            toast.error(t('login.error_required'));
            return;
        }

        setIsLoading(true);

        // Try admin login first
        try {
            const response = await authService.login({
                username: formData.username,
                password: formData.password,
                role: 'admin',
            });

            login(response.token, response.user, 'admin');
            toast.success(t('login.success'));
            window.location.href = '/admin/dashboard';
            return;
        } catch (adminError: any) {
            console.log('Admin login failed, checking requires_activation or trying technician...', adminError);

            if (adminError.response?.data?.requires_activation) {
                toast.success('Kod OTP pengaktifan akaun diperlukan.');
                setPendingActivation({
                    email: adminError.response.data.email,
                    username: adminError.response.data.username,
                    role: 'admin'
                });
                setCooldown(60);
                setIsLoading(false);
                return;
            }

            // Admin login failed (not activation), try technician
            try {
                const response = await authService.login({
                    username: formData.username,
                    password: formData.password,
                    role: 'technician',
                });

                console.log('Technician login success:', response);

                login(response.token, response.user, 'technician');
                window.location.href = '/admin/technician/dashboard';
                return;
            } catch (techError: any) {
                console.log('Technician login failed:', techError);
                if (techError.response?.data?.requires_activation) {
                    toast.success('Kod OTP pengaktifan akaun diperlukan.');
                    setPendingActivation({
                        email: techError.response.data.email,
                        username: techError.response.data.username,
                        role: 'technician'
                    });
                    setCooldown(60);
                    setIsLoading(false);
                    return;
                }
                // Both failed - show error
                toast.error(techError.response?.data?.error || t('login.failed'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pendingActivation) return;
        if (otp.length !== 6) {
            toast.error('Sila masukkan kod OTP 6-digit.');
            return;
        }

        setIsVerifying(true);
        try {
            const response = await authService.verifyActivationOtp({
                username: pendingActivation.username,
                role: pendingActivation.role,
                otp
            });

            login(response.token, response.user, pendingActivation.role);
            toast.success(response.message || 'Akaun anda berjaya diaktifkan!');
            
            if (pendingActivation.role === 'admin') {
                window.location.href = '/admin/dashboard';
            } else {
                window.location.href = '/admin/technician/dashboard';
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Pengesahan OTP gagal');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResendOtp = async () => {
        if (!pendingActivation || cooldown > 0) return;
        try {
            await authService.resendActivationOtp({
                username: pendingActivation.username,
                role: pendingActivation.role
            });
            toast.success('Kod OTP baharu telah dihantar ke e-mel berdaftar anda.');
            setCooldown(60);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal menghantar semula kod OTP.');
        }
    };

    const handleBackToLogin = () => {
        setPendingActivation(null);
        setOtp('');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-indigo-900 flex items-center justify-center px-4 relative">
            <div className="absolute top-4 right-4 z-10">
                <LanguageSwitcher className="text-white hover:bg-white/10" />
            </div>

            <div className="w-full max-w-md">
                {/* Back button */}
                <button
                    onClick={pendingActivation ? handleBackToLogin : () => navigate('/')}
                    className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {pendingActivation ? 'Kembali ke Log Masuk' : t('login.back')}
                </button>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-8 animate-fade-in transition-all duration-300">
                    
                    {!pendingActivation ? (
                        <>
                            {/* Header */}
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <LogIn className="w-8 h-8 text-white" />
                                </div>
                                <h1 className="text-2xl font-bold text-gray-800">{t('login.title')}</h1>
                                <p className="text-gray-500 mt-1">{t('login.subtitle')}</p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('login.username')}
                                    </label>
                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        placeholder={t('login.placeholder_username')}
                                        className="input-field"
                                        autoComplete="username"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('login.password')}
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder={t('login.placeholder_password')}
                                            className="input-field pr-12"
                                            autoComplete="current-password"
                                            required
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

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
                        </>
                    ) : (
                        // OTP Activation View for Admin/Technician
                        <div className="text-center animate-fade-in">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <KeyRound className="w-8 h-8 text-white animate-pulse" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">Aktifkan Akaun Anda</h2>
                            <p className="text-gray-500 mt-2">
                                Sila masukkan kod OTP yang dihantar ke e-mel berdaftar anda:
                            </p>
                            <div className="flex items-center justify-center gap-2 mt-2 font-semibold text-gray-700 bg-gray-50 py-2 px-4 rounded-lg inline-flex mx-auto">
                                <Mail className="w-4 h-4 text-indigo-600" />
                                <span>{pendingActivation.email}</span>
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
                                    className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isVerifying ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        'Sahkan & Aktifkan Akaun'
                                    )}
                                </button>
                            </form>

                            <div className="mt-6 flex flex-col items-center justify-center gap-4">
                                <button
                                    onClick={handleResendOtp}
                                    disabled={cooldown > 0}
                                    className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
                                        cooldown > 0
                                            ? 'text-gray-400 cursor-not-allowed'
                                            : 'text-indigo-600 hover:text-indigo-700'
                                    }`}
                                >
                                    <RefreshCw className={`w-4 h-4 ${cooldown > 0 ? '' : 'hover:animate-spin'}`} />
                                    {cooldown > 0 ? `Hantar Semula (${cooldown}s)` : 'Hantar Semula Kod OTP'}
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
