import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff } from 'lucide-react';
import UserLayout from '../../components/UserLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { State } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function UserProfile() {
    const { t } = useTranslation();
    const { user, updateUser } = useAuth();
    const [states, setStates] = useState<State[]>([]);
    const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        contact_no: '',
        contact_no_2: '',
        address: '',
        state: '',
    });

    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });

    const [showPasswords, setShowPasswords] = useState(false);

    useEffect(() => {
        loadStates();
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                email: user.email || '',
                contact_no: (user as any).contact_no || '',
                contact_no_2: (user as any).contact_no_2 || '',
                address: (user as any).address || '',
                state: (user as any).state || '',
            });
        }
    }, [user]);

    const loadStates = async () => {
        try {
            const response = await api.get('/states');
            setStates(response.data.states);
        } catch (error) {
            console.error('Failed to load states');
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await api.put('/users/profile', formData);
            updateUser({ ...user!, ...response.data.user });
            toast.success(t('admin_master.success_update'));
        } catch (error: any) {
            toast.error(error.response?.data?.error || t('common.error_load'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordData.new_password.length < 6) {
            toast.error(t('user_auth.pass_min_length'));
            return;
        }

        if (passwordData.new_password !== passwordData.confirm_password) {
            toast.error(t('user_auth.pass_mismatch'));
            return;
        }

        setIsLoading(true);
        try {
            await api.put('/users/password', {
                current_password: passwordData.current_password,
                new_password: passwordData.new_password,
            });

            setPasswordData({
                current_password: '',
                new_password: '',
                confirm_password: '',
            });
            toast.success(t('admin_master.success_update'));
        } catch (error: any) {
            toast.error(error.response?.data?.error || t('common.error_load'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <UserLayout title={t('user_dashboard.title_profile')} breadcrumb={t('user_dashboard.title_profile')}>
            <div className="max-w-3xl mx-auto">
                {/* Tabs */}
                <div className="flex p-1 bg-gray-100 rounded-xl mb-6 shadow-inner">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'profile'
                            ? 'bg-white text-indigo-600 shadow-sm transform scale-[1.02]'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        {t('user_dashboard.tab_profile')}
                    </button>
                    <button
                        onClick={() => setActiveTab('password')}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'password'
                            ? 'bg-white text-indigo-600 shadow-sm transform scale-[1.02]'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        {t('user_dashboard.tab_password')}
                    </button>
                </div>

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="card shadow-xl border border-gray-100/50 animate-fade-in">
                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('user_dashboard.label_full_name')}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        className="input-field border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('user_dashboard.label_ic')}
                                    </label>
                                    <input
                                        type="text"
                                        value={user?.ic_number || ''}
                                        disabled
                                        className="input-field bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200"
                                    />
                                    <p className="text-xs text-gray-400 mt-1 italic">{t('user_dashboard.ic_immutable')}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('user_dashboard.label_email')}
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="input-field border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('user_dashboard.label_phone1')}
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.contact_no}
                                        onChange={(e) => setFormData({ ...formData, contact_no: e.target.value })}
                                        className="input-field border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('user_dashboard.label_phone2')}
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.contact_no_2}
                                        onChange={(e) => setFormData({ ...formData, contact_no_2: e.target.value })}
                                        className="input-field border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('user_dashboard.label_address')}
                                    </label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        rows={3}
                                        className="input-field resize-none border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('user_dashboard.label_state')}
                                    </label>
                                    <select
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        className="input-field border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow"
                                    >
                                        <option value="">-- {t('common.select')} {t('user_dashboard.label_state')} --</option>
                                        {states.map((state) => (
                                            <option key={state.id} value={state.name}>
                                                {state.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none transform"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            {t('user_dashboard.btn_save_changes')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Password Tab */}
                {activeTab === 'password' && (
                    <div className="card shadow-xl border border-gray-100/50 animate-fade-in">
                        <form onSubmit={handleChangePassword} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('user_dashboard.current_password')}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasswords ? 'text' : 'password'}
                                        value={passwordData.current_password}
                                        onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                        className="input-field pr-12 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords(!showPasswords)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                                    >
                                        {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('user_dashboard.new_password')}
                                </label>
                                <input
                                    type={showPasswords ? 'text' : 'password'}
                                    value={passwordData.new_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                    className="input-field border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('user_dashboard.confirm_password')}
                                </label>
                                <input
                                    type={showPasswords ? 'text' : 'password'}
                                    value={passwordData.confirm_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                    className="input-field border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow"
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none transform"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            {t('user_dashboard.btn_change_password')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </UserLayout>
    );
}
