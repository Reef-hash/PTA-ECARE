import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function GoogleCompleteProfile() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoading: authLoading, updateUser } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        ic_number: '',
        contact_no: '',
        address: '',
    });

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
        if (ic && !ic.startsWith('G-')) {
            navigate('/users/dashboard', { replace: true });
        }
    }, [isAuthenticated, user, authLoading, navigate]);

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
                address: formData.address,
            });

            // Update local user data
            updateUser({ ...user!, ...response.data.user });
            toast.success('Profil berjaya dikemaskini!');
            navigate('/users/dashboard', { replace: true });
        } catch (error: any) {
            toast.error(error.response?.data?.error || t('common.error_load'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const fullName = (user as any)?.full_name || 'Google User';
    const email = (user as any)?.email || '';
    const picture = (user as any)?.google_picture || null;
    const initial = fullName.charAt(0).toUpperCase();

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
                <Link
                    to="/users/register"
                    className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('user_auth.back_login')}
                </Link>

                <div className="bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
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
                </div>
            </div>
        </div>
    );
}
