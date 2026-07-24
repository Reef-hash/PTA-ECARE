import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import MainTechLayout from '../../components/MainTechLayout';
import { User, Mail, Save, Eye, EyeOff, Edit2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminProfilePage() {
    const { t } = useTranslation();
    const { role } = useAuth();
    const isTechnician = role === 'technician';
    const isMainTech = role === 'main_technician';
    const pageTitle = isMainTech ? t('admin_profile.title_tech') : isTechnician ? t('admin_profile.title_tech') : t('admin_profile.title');

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Edit mode state
    const [isEditing, setIsEditing] = useState(false);

    // Form state
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');

    // Original state for cancel
    const [originalData, setOriginalData] = useState({ username: '', email: '' });

    // Password change state
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const res = await api.get('/admin/profile');
            setUsername(res.data.username);
            setEmail(res.data.email || '');
            setOriginalData({
                username: res.data.username,
                email: res.data.email || ''
            });
        } catch (error) {
            toast.error(t('common.error_load') || 'Failed to load profile');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditToggle = () => {
        if (isEditing) {
            // Cancel edit - revert data
            setUsername(originalData.username);
            setEmail(originalData.email);
            setIsEditing(false);
        } else {
            // Start edit
            setIsEditing(true);
        }
    };

    const handleSaveProfile = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!username.trim()) {
            toast.error(t('admin_profile.error_username_required') || 'Username is required');
            return;
        }

        setIsSaving(true);
        try {
            await api.put('/admin/profile', { username, email });
            toast.success(t('admin_profile.success_update') || 'Profile updated successfully');
            setOriginalData({ username, email });
            setIsEditing(false);
            loadProfile();
        } catch (error: any) {
            toast.error(error.response?.data?.error || t('admin_profile.error_update') || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error(t('admin_profile.error_password_fields') || 'Please fill all password fields');
            return;
        }
        if (newPassword.length < 6) {
            toast.error(t('admin_profile.error_password_length') || 'New password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error(t('admin_profile.error_password_mismatch') || 'Passwords do not match');
            return;
        }

        setIsChangingPassword(true);
        try {
            await api.put('/admin/profile/password', { currentPassword, newPassword });
            toast.success(t('admin_profile.success_password') || 'Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowConfirmPassword(false);
            setShowPasswordSection(false);
        } catch (error: any) {
            toast.error(error.response?.data?.error || t('admin_profile.error_password') || 'Failed to change password');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const Layout = isMainTech ? MainTechLayout : AdminLayout;

    if (isLoading) {
        return (
            <Layout title={pageTitle || 'Profile'} breadcrumb={pageTitle || 'Profile'}>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title={pageTitle || 'Profile'} breadcrumb={pageTitle || 'Profile'}>
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Profile Info Card */}
                <div className="card">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <User className="w-5 h-5 text-indigo-600" />
                            {t('admin_profile.profile_info') || 'Profile Information'}
                        </h2>
                        <button
                            onClick={handleEditToggle}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isEditing
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                }`}
                        >
                            {isEditing ? (
                                <>
                                    <X className="w-4 h-4" />
                                    {t('common.cancel') || 'Cancel'}
                                </>
                            ) : (
                                <>
                                    <Edit2 className="w-4 h-4" />
                                    {t('common_actions.edit') || 'Edit'}
                                </>
                            )}
                        </button>
                    </div>

                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        {/* Username */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('admin_profile.username') || 'Username'}
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className={`input-field pl-10 ${!isEditing ? 'bg-gray-50 text-gray-500' : ''}`}
                                    placeholder={t('admin_profile.placeholder_username') || 'Enter username'}
                                    disabled={!isEditing}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('admin_profile.email') || 'Email'}
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`input-field pl-10 ${!isEditing ? 'bg-gray-50 text-gray-500' : ''}`}
                                    placeholder="adminecare.ptasssb@gmail.com"
                                    disabled={!isEditing}
                                />
                            </div>
                        </div>

                        {/* Save Button */}
                        {isEditing && (
                            <div className="pt-4 border-t flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    {isSaving ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    {t('admin_profile.save') || 'Save Changes'}
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                {/* Password Change Card */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            🔒 {t('admin_profile.change_password') || 'Change Password'}
                        </h2>
                        <button
                            onClick={() => setShowPasswordSection(!showPasswordSection)}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                            {showPasswordSection
                                ? (t('common.cancel') || 'Cancel')
                                : (t('admin_profile.btn_change') || 'Change')}
                        </button>
                    </div>

                    {showPasswordSection && (
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            {/* Current Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('admin_profile.current_password') || 'Current Password'}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="input-field pr-10"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('admin_profile.new_password') || 'New Password'}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="input-field pr-10"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('admin_profile.confirm_password') || 'Confirm New Password'}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="input-field pr-10"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Change Password Button */}
                            <div className="pt-4 border-t flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isChangingPassword}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    {isChangingPassword ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    {t('admin_profile.btn_update_password') || 'Update Password'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </Layout>
    );
}
