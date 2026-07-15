import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, ArrowLeft, KeyRound, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/auth.service';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import GoogleSignInButton from '../../components/GoogleSignInButton';


export default function UserRegister() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { login } = useAuth();
    const [searchParams] = useSearchParams();
    
    // Registration form states
    const [formData, setFormData] = useState({
        full_name: '',
        ic_number: '',
        email: '',
        contact_no: '',
        contact_no_2: '',
        address: '',
        state: '',
        password: '',
        confirm_password: '',
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

    // Check for email & otp parameters in URL for auto-verification
    useEffect(() => {
        const emailParam = searchParams.get('email');
        const otpParam = searchParams.get('otp');
        if (emailParam && otpParam) {
            setOtpEmail(emailParam);
            setOtp(otpParam);
            setRequiresOtp(true);
            
            const autoVerify = async () => {
                setIsVerifying(true);
                try {
                    const response = await authService.verifySignupOtp({
                        email: emailParam,
                        otp: otpParam
                    });
                    login(response.token, response.user, 'user');
                    toast.success(response.message || 'Akaun anda berjaya diaktifkan!');
                    navigate('/users/dashboard');
                } catch (error: any) {
                    toast.error(error.response?.data?.error || 'Kod OTP tidak sah atau telah tamat tempoh');
                } finally {
                    setIsVerifying(false);
                }
            };
            autoVerify();
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.full_name || !formData.ic_number || !formData.contact_no || !formData.address || !formData.password) {
            toast.error(t('user_auth.fill_required'));
            return;
        }

        if (formData.ic_number.length !== 12) {
            toast.error(t('user_auth.ic_length'));
            return;
        }

        if (formData.password.length < 6) {
            toast.error(t('user_auth.pass_min_length'));
            return;
        }

        if (formData.password !== formData.confirm_password) {
            toast.error(t('user_auth.pass_mismatch'));
            return;
        }



        setIsLoading(true);
        try {
            const response = await authService.register({
                full_name: formData.full_name,
                ic_number: formData.ic_number,
                email: formData.email,
                contact_no: formData.contact_no,
                contact_no_2: formData.contact_no_2 || undefined,
                address: formData.address,
                state: formData.state || undefined,
                password: formData.password,
            });

            if (response.requires_otp) {
                toast.success(response.message || 'Sila sahkan e-mel anda menggunakan kod OTP.');
                setOtpEmail(response.email);
                setRequiresOtp(true);
                setCooldown(60);
            } else {
                login(response.token, response.user, 'user');
                toast.success(t('user_auth.success_register'));
                navigate('/users/dashboard');
            }
        } catch (error: any) {
            console.error('Registration error:', error?.response?.data || error);
            const errorMsg = error.response?.data?.error || error.response?.data?.details?.[0]?.message || 'Pendaftaran gagal';
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

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
                toast.success(response.message || 'Akaun anda berjaya diaktifkan!');
                navigate('/users/dashboard');
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

    const handleBackToRegister = () => {
        setRequiresOtp(false);
        setOtp('');
    };

    const handleGoogleSuccess = async (credential: string) => {
        setIsGoogleLoading(true);
        try {
            const response = await authService.googleAuth({
                credential, // direct JWT token from Google Console
                intent: 'register',
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
                toast.success('Pendaftaran berjaya! Sila lengkapkan profil anda.');
                navigate('/lengkapkan-profil', { replace: true });
            } else {
                toast.success(t('user_auth.success_register'));
                navigate('/users/dashboard', { replace: true });
            }
        } catch (error: any) {
            const errorData = error.response?.data;
            if (errorData?.redirect_to_login) {
                toast.error(errorData.error || 'Akaun email ini sudah didaftarkan. Sila Log In.');
                navigate('/users', { replace: true });
            } else {
                toast.error(errorData?.error || t('common.error_load'));
            }
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-primary-900 py-8 px-4 flex items-center justify-center">
            <div className="max-w-2xl w-full mx-auto">
                {/* Back button */}
                <button
                    onClick={requiresOtp ? handleBackToRegister : () => navigate('/')}
                    className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {requiresOtp ? 'Kembali ke Pendaftaran' : t('login.back')}
                </button>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-8 animate-fade-in transition-all duration-300">
                    
                    {!requiresOtp ? (
                        <>
                            {/* Header */}
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <UserPlus className="w-8 h-8 text-white" />
                                </div>
                                <h1 className="text-2xl font-bold text-gray-800">{t('user_auth.register_title')}</h1>
                                <p className="text-gray-500 mt-1">{t('user_auth.register_subtitle')}</p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('user_dashboard.label_full_name')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            placeholder={t('user_dashboard.label_full_name')}
                                            className="input-field"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('user_dashboard.label_ic')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.ic_number}
                                            onChange={(e) => setFormData({ ...formData, ic_number: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                                            placeholder="901234567890"
                                            className="input-field"
                                            maxLength={12}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('user_dashboard.label_email')} <span className="text-gray-400 text-xs font-normal ml-1">(tidak wajib)</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="email@example.com"
                                            className="input-field"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('user_dashboard.label_phone1')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.contact_no}
                                            onChange={(e) => setFormData({ ...formData, contact_no: e.target.value.replace(/\D/g, '') })}
                                            placeholder="0123456789"
                                            className="input-field"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('user_dashboard.label_phone2')} <span className="text-red-500">*</span> <span className="text-gray-400 text-xs font-normal ml-1">(Jika tiada No Phone 2, masukkan nombor phone yang sama)</span>
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.contact_no_2}
                                            onChange={(e) => setFormData({ ...formData, contact_no_2: e.target.value.replace(/\D/g, '') })}
                                            placeholder="0198765432"
                                            className="input-field"
                                            required
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('user_dashboard.label_address')} <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            placeholder={t('user_dashboard.label_address')}
                                            rows={3}
                                            className="input-field resize-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Kata Laluan <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                placeholder="Minimum 6 aksara"
                                                className="input-field pr-12"
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

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('user_dashboard.confirm_password')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.confirm_password}
                                            onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                                            placeholder={t('user_dashboard.confirm_password')}
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || isGoogleLoading}
                                    className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <UserPlus className="w-5 h-5" />
                                            {t('user_auth.btn_register')}
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
                                text="signup_with"
                                onSuccess={handleGoogleSuccess}
                                disabled={isLoading || isGoogleLoading}
                                disabledLabel={t('common.loading')}
                                unavailableLabel={t('user_auth.google_unavailable')}
                                isConfigured={!!import.meta.env.VITE_GOOGLE_CLIENT_ID}
                            />

                            {/* Login link */}
                            <p className="text-center text-gray-500 mt-6">
                                {t('user_auth.link_login').split('?')[0]}?{' '}
                                <Link to="/users" className="text-primary-600 hover:text-primary-700 font-medium">
                                    {t('user_auth.link_login').split('?')[1] || 'Login'}
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
                                            : 'text-primary-600 hover:text-primary-700'
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
