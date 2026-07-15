import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Key, Search, Eye, EyeOff } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import { Technician } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function Technicians() {
    const { t } = useTranslation();
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [showResetModal, setShowResetModal] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        loadTechnicians();
    }, []);

    const loadTechnicians = async () => {
        try {
            const response = await api.get('/admin/technicians');
            setTechnicians(response.data.technicians);
        } catch (error) {
            toast.error(t('common.error_load'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/admin/technicians/${id}`);
            toast.success(t('admin_technicians.technician_deleted'));
            setTechnicians(technicians.filter(t => t.id !== id));
            setShowDeleteModal(null);
        } catch (error: any) {
            toast.error(error.response?.data?.error || t('common.error_load'));
        }
    };

    const handleResetPassword = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newPassword || newPassword.length < 6) {
            toast.error(t('admin_technicians.new_password_placeholder'));
            return;
        }

        try {
            await api.post(`/admin/technicians/${showResetModal}/reset-password`, { new_password: newPassword });
            toast.success(t('admin_technicians.password_reset_success'));
            setShowResetModal(null);
            setNewPassword('');
            setShowPassword(false);
        } catch (error: any) {
            toast.error(error.response?.data?.error || t('common.error_load'));
        }
    };

    const filteredTechnicians = technicians.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.department.toLowerCase().includes(search.toLowerCase()) ||
        t.username.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AdminLayout title={t('admin_technicians.title')} breadcrumb={t('admin_technicians.title')}>
            <div className="card">
                {/* Header */}
                <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('admin_technicians.search_placeholder')}
                            className="input-field pl-10"
                        />
                    </div>
                    <Link to="/admin/technicians/add" className="btn-primary flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        {t('admin_technicians.add_technician')}
                    </Link>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                    </div>
                ) : filteredTechnicians.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">{t('admin_technicians.no_technicians')}</p>
                    </div>
                ) : (
                    <div className="overflow-hidden sm:rounded-lg">
                        {/* Mobile Layout */}
                        <div className="block md:hidden border-t border-gray-200">
                            {filteredTechnicians.map((tech, index) => (
                                <div key={tech.id} className="bg-white border-b border-gray-200 p-4 last:border-b-0 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400 font-medium text-xs">#{index + 1}</span>
                                            <Link
                                                to={`/admin/technicians/${tech.id}`}
                                                className="text-indigo-600 hover:underline hover:text-indigo-800 font-bold text-sm"
                                            >
                                                {tech.name}
                                            </Link>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Link
                                                to={`/admin/technicians/edit/${tech.id}`}
                                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                title={t('common_actions.edit')}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => setShowResetModal(tech.id)}
                                                className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                                title={t('admin_technicians.reset_password_title')}
                                            >
                                                <Key className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteModal(tech.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title={t('common_actions.delete')}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm items-center mb-2">
                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider">Username</span>
                                        <span className="text-gray-700 text-xs font-medium">{tech.username}</span>

                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('admin_technicians.department')}</span>
                                        <span className="text-gray-700 text-xs">{tech.department}</span>

                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('admin_technicians.email')}</span>
                                        <span className="text-gray-700 text-xs">{tech.email || '-'}</span>

                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('common_actions.phone_no')}</span>
                                        <span className="text-gray-700 text-xs">{tech.contact_number}</span>
                                    </div>

                                    <div className="mt-2 flex justify-start">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${tech.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {tech.is_active ? t('admin_users.active') : t('admin_users.inactive')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="table-header">
                                        <th className="text-left px-4 py-3 whitespace-nowrap">#</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('common_actions.name')}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">Username</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('admin_technicians.department')}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('admin_technicians.email')}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('common_actions.phone_no')}</th>
                                        <th className="text-center px-4 py-3 whitespace-nowrap">{t('common_actions.status')}</th>
                                        <th className="text-center px-4 py-3 whitespace-nowrap">{t('common_actions.action')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTechnicians.map((tech, index) => (
                                        <tr key={tech.id} className="table-row">
                                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{index + 1}</td>
                                            <td className="px-4 py-3 font-medium whitespace-nowrap">
                                                <Link
                                                    to={`/admin/technicians/${tech.id}`}
                                                    className="text-indigo-600 hover:underline hover:text-indigo-800"
                                                >
                                                    {tech.name}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{tech.username}</td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{tech.department}</td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{tech.email || '-'}</td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{tech.contact_number}</td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <span className={`badge ${tech.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {tech.is_active ? t('admin_users.active') : t('admin_users.inactive')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link
                                                        to={`/admin/technicians/edit/${tech.id}`}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title={t('common_actions.edit')}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => setShowResetModal(tech.id)}
                                                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                        title={t('admin_technicians.reset_password_title')}
                                                    >
                                                        <Key className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setShowDeleteModal(tech.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title={t('common_actions.delete')}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold mb-4">{t('admin_technicians.confirm_delete_title')}</h3>
                        <p className="text-gray-600 mb-6">{t('admin_technicians.confirm_delete_msg')}</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowDeleteModal(null)} className="btn-secondary">
                                {t('common_actions.cancel')}
                            </button>
                            <button onClick={() => handleDelete(showDeleteModal)} className="btn-danger">
                                {t('common_actions.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-soft-xl">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">{t('admin_technicians.reset_password_title')}</h3>
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder={t('admin_technicians.new_password_placeholder')}
                                    className="input-field pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowResetModal(null); setNewPassword(''); setShowPassword(false); }}
                                    className="btn-secondary"
                                >
                                    {t('common_actions.cancel')}
                                </button>
                                <button type="submit" className="btn-primary">
                                    {t('common_actions.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
