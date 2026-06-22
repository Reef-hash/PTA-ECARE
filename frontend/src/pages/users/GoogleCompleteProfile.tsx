import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCheck, KeyRound, Mail, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import authService from '../../services/auth.service';

export default function GoogleCompleteProfile() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoading: authLoading, updateUser, login } = useAuth();

    const fullName = (user as any)?.full_name || 'Google User';
    const email = (user as any)?.email || '';
    const picture = (user as any)?.google_picture || null;
    const initial = fullName.charAt(0).toUpperCase();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        ic_number: '',
        contact_no: '',
        contact_no_2: '',
        address: '',
    });

    // OTP states
    const [requiresOtp, setRequiresOtp] = useState(false);
    const [otpEmail, setOtpEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    // Cooldown timer for resending OTP
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    // Redirect if not logged in or profile is already complete
    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated || !user) {
            toast.error('Sila log masuk dahulu.');
            navigate('/users/register', { replace: true });
            return;
        }

        // If IC does NOT start with G-, profile is already complete
        const ic = (user as any)?.ic_number || '';
        if (ic && !ic.startsWith('G-') && !requiresOtp) {
            navigate('/users/dashboard', { replace: true });
        }
    }, [isAuthenticated, user, authLoading, navigate, requiresOtp]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.ic_number || !formData.contact_no || !formData.address) {
            toast.error(t('user_auth.fill_required') || 'Sila isi semua maklumat wajib');
            return;
        }

        if (formData.ic_number.length !== 12) {
            toast.error(t('user_auth.ic_length') || 'No IC mestilah 12 digit');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await api.put('/users/profile', {
                ic_number: formData.ic_number,
                contact_no: formData.contact_no,
                contact_no_2: formData.contact_no_2 || null,
                address: formData.address,
            });

            if (response.data.requires_otp) {
                toast.success(response.data.message || 'Sila sahkan e-mel anda menggunakan kod OTP.');
                setOtpEmail(response.data.email || email);
                setRequiresOtp(true);
                setCooldown(60);
            } else {
                // Update local user data
                updateUser({ ...user!, ...response.data.user });
                toast.success('Profil berjaya dikemaskini!');
                navigate('/users/dashboard', { replace: true });
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || t('common.error_load'));
        } finally {
            setIsSubmitting(false);
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

            // Update user in auth context
            updateUser({ ...user!, ...response.user });
            
            // Set the login tokens locally
            login(response.token, response.user, 'user');
            
            toast.success(response.message || 'Akaun anda berjaya diaktifkan!');
            navigate('/users/dashboard', { replace: true });
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

    const handleBackToProfile = () => {
        setRequiresOtp(false);
        setOtp('');
    };



    // Show loading while auth context initialises
    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-primary-900 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
                    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Memuatkan...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-primary-900 py-8 px-4">
            <div className="max-w-xl mx-auto">
                <button
                    onClick={requiresOtp ? handleBackToProfile : () => navigate('/users/register')}
                    className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {requiresOtp ? 'Kembali ke Borang Profil' : t('login.back')}
                </button>

                <div className="bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
                    {!requiresOtp ? (
                        <>
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <UserCheck className="w-8 h-8 text-white" />
                                </div>
                                <h1 className="text-2xl font-bold text-gray-800">Lengkapkan Profil</h1>
                                <p className="text-gray-500 mt-1">Sahkan maklumat pelanggan sebelum masuk ke E-CARE.</p>
                            </div>

                            {/* Google profile info card */}
                            <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 mb-6">
                                {picture ? (
                                    <img
                                        src={picture}
                                        alt={fullName}
                                        className="w-14 h-14 rounded-full object-cover bg-white"
                                    />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-primary-600 flex items-center justify-center text-white text-xl font-bold">
                                        {initial}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-800 truncate">{fullName}</p>
                                    <p className="text-sm text-gray-500 truncate">{email || 'Google email verified'}</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
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
                                        disabled={isSubmitting}
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
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('user_dashboard.label_phone2')}
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.contact_no_2}
                                        onChange={(e) => setFormData({ ...formData, contact_no_2: e.target.value.replace(/\D/g, '') })}
                                        placeholder="0131234567"
                                        className="input-field"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('user_dashboard.label_address')} <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder={t('user_dashboard.label_address')}
                                        rows={4}
                                        className="input-field resize-none"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <UserCheck className="w-5 h-5" />
                                            Teruskan
                                        </>
                                    )}
                                </button>
                            </form>
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
            </div>
        </div>
    );
}
