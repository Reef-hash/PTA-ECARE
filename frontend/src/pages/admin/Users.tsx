import { useEffect, useState } from 'react';
import { Search, UserCheck, UserX, UserPlus, X, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import { User } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function Users() {
    const { t } = useTranslation();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Add Customer Modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        ic_number: '',
        email: '',
        contact_no: '',
        contact_no_2: '',
        address: '',
        state: '',
        password: '',
    });

    // Delete Modal State
    const [userToDelete, setUserToDelete] = useState<{ id: string, name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const response = await api.get('/admin/users?limit=1000');
            setUsers(response.data.users);
        } catch (error) {
            toast.error(t('common.error_load'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (userId: string, newStatus: 'Active' | 'Inactive' | 'Suspended') => {
        try {
            await api.put(`/admin/users/${userId}/status`, { status: newStatus });
            setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
            toast.success(t('admin_users.status_updated'));
        } catch (error: any) {
            toast.error(error.response?.data?.error || t('admin_users.status_error'));
        }
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        
        try {
            await api.delete(`/admin/users/${userToDelete.id}`);
            setUsers(users.filter(u => u.id !== userToDelete.id));
            toast.success(t('admin_users.delete_success'));
            setUserToDelete(null);
        } catch (error: any) {
            toast.error(error.response?.data?.error || t('admin_users.delete_error'));
        } finally {
            setIsDeleting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            full_name: '',
            ic_number: '',
            email: '',
            contact_no: '',
            contact_no_2: '',
            address: '',
            state: '',
            password: '',
        });
        setShowPassword(false);
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.full_name || !formData.ic_number || !formData.contact_no || !formData.contact_no_2 || !formData.address || !formData.password) {
            toast.error('Sila isi semua maklumat wajib.');
            return;
        }

        if (formData.ic_number.length !== 12) {
            toast.error('No IC mestilah 12 digit.');
            return;
        }

        if (formData.password.length < 6) {
            toast.error('Kata laluan mestilah sekurang-kurangnya 6 aksara.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: any = {
                full_name: formData.full_name,
                ic_number: formData.ic_number,
                contact_no: formData.contact_no,
                contact_no_2: formData.contact_no_2,
                address: formData.address,
                password: formData.password,
            };
            if (formData.email) payload.email = formData.email;
            if (formData.state) payload.state = formData.state;

            const response = await api.post('/admin/users', payload);
            toast.success(response.data.message || 'Pelanggan berjaya didaftarkan.');
            setShowAddModal(false);
            resetForm();
            loadUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal mendaftarkan pelanggan.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const filteredUsers = users.filter(u =>
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.ic_number.includes(search) ||
        u.contact_no.includes(search)
    );

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const displayedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Active':
                return <span className="badge bg-green-100 text-green-700">{t('admin_users.active')}</span>;
            case 'Inactive':
                return <span className="badge bg-gray-100 text-gray-700">{t('admin_users.inactive')}</span>;
            case 'Suspended':
                return <span className="badge bg-red-100 text-red-700">{t('admin_users.suspended')}</span>;
            default:
                return null;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ms-MY', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <AdminLayout title={t('admin_users.title')} breadcrumb={t('admin_users.title')}>
            <div className="card">
                {/* Search + Add Button */}
                <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="relative flex-1 w-full sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            placeholder={t('admin_users.search_placeholder')}
                            className="input-field pl-10"
                        />
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap"
                    >
                        <UserPlus className="w-4 h-4" />
                        Tambah Pelanggan
                    </button>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">{t('admin_users.no_users')}</p>
                    </div>
                ) : (<>
                    <div className="overflow-hidden sm:rounded-lg">
                        {/* Mobile Layout (List-Item Compact) */}
                        <div className="block md:hidden border-t border-gray-200">
                            {displayedUsers.map((user, index) => (
                                <div key={user.id} className="bg-white border-b border-gray-200 p-4 last:border-b-0 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400 font-medium text-xs">#{(currentPage - 1) * itemsPerPage + index + 1}</span>
                                            <Link
                                                to={`/admin/users/${user.id}`}
                                                className="text-indigo-600 hover:underline hover:text-indigo-800 font-bold text-sm"
                                            >
                                                {user.full_name}
                                            </Link>
                                        </div>
                                        <div className="flex-shrink-0">
                                            {getStatusBadge(user.status)}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm mt-2 items-center">
                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider">No IC</span>
                                        <span className="text-gray-900 font-medium text-xs">{user.ic_number}</span>

                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('admin_users.phone_number')}</span>
                                        <span className="text-gray-900 font-medium text-xs">{user.contact_no}</span>

                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('admin_master.title_states').replace('Pengurusan ', '')}</span>
                                        <span className="text-gray-900 font-medium text-xs">{user.state || '-'}</span>

                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider">E-mel</span>
                                        <span className="text-gray-900 font-medium text-xs">{user.email || '-'}</span>

                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('common_actions.date')}</span>
                                        <span className="text-gray-900 font-medium text-xs">{formatDate(user.created_at)}</span>
                                    </div>
                                    
                                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                                        {user.status !== 'Active' && (
                                            <button
                                                onClick={() => handleStatusChange(user.id, 'Active')}
                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-100"
                                                title={t('admin_users.confirm_active')}
                                            >
                                                <UserCheck className="w-4 h-4" />
                                            </button>
                                        )}
                                        {user.status !== 'Suspended' && (
                                            <button
                                                onClick={() => handleStatusChange(user.id, 'Suspended')}
                                                className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-orange-100"
                                                title={t('admin_users.confirm_suspend')}
                                            >
                                                <UserX className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setUserToDelete({ id: user.id, name: user.full_name })}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                                            title={t('admin_users.delete_title')}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Layout (Table) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="table-header">
                                        <th className="text-left px-4 py-3 whitespace-nowrap">#</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('common_actions.name')}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">No IC</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('admin_users.phone_number')}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('admin_master.title_states').replace('Pengurusan ', '')}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('common_actions.date')}</th>
                                        <th className="text-center px-4 py-3 whitespace-nowrap">{t('common_actions.status')}</th>
                                        <th className="text-center px-4 py-3 whitespace-nowrap">{t('common_actions.action')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedUsers.map((user, index) => (
                                        <tr key={user.id} className="table-row">
                                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div>
                                                    <Link to={`/admin/users/${user.id}`} className="font-medium hover:text-indigo-600 transition-colors">
                                                        {user.full_name}
                                                    </Link>
                                                    <p className="text-xs text-gray-500">{user.email || '-'}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{user.ic_number}</td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{user.contact_no}</td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{user.state || '-'}</td>
                                            <td className="px-4 py-3 text-gray-500 text-sm whitespace-nowrap">{formatDate(user.created_at)}</td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge(user.status)}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    {user.status !== 'Active' && (
                                                        <button
                                                            onClick={() => handleStatusChange(user.id, 'Active')}
                                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                            title={t('admin_users.confirm_active')}
                                                        >
                                                            <UserCheck className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {user.status !== 'Suspended' && (
                                                        <button
                                                            onClick={() => handleStatusChange(user.id, 'Suspended')}
                                                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                            title={t('admin_users.confirm_suspend')}
                                                        >
                                                            <UserX className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setUserToDelete({ id: user.id, name: user.full_name })}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title={t('admin_users.delete_title')}
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

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center mt-6 gap-2">
                            <button
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1 rounded bg-gray-100 text-gray-600 disabled:opacity-50 hover:bg-gray-200"
                            >
                                &lt;
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => paginate(i + 1)}
                                    className={`px-3 py-1 rounded ${currentPage === i + 1 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 rounded bg-gray-100 text-gray-600 disabled:opacity-50 hover:bg-gray-200"
                            >
                                &gt;
                            </button>
                        </div>
                    )}
                </>
                )}
            </div>

            {/* Add Customer Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                    <UserPlus className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800">Tambah Pelanggan</h2>
                            </div>
                            <button
                                onClick={() => { setShowAddModal(false); resetForm(); }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleAddUser} className="p-6 space-y-4">
                            {/* Nama Penuh */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Nama Penuh <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="Ahmad bin Abu"
                                    className="input-field"
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* No IC */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    No Kad Pengenalan <span className="text-red-500">*</span>
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

                            {/* E-mel */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    E-mel <span className="text-xs text-gray-400 font-normal">(tidak wajib)</span>
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="contoh@gmail.com"
                                    className="input-field"
                                    disabled={isSubmitting}
                                />
                                <p className="text-xs text-gray-500 mt-1">Biarkan kosong jika pelanggan tiada e-mel.</p>
                            </div>

                            {/* No Telefon 1 & 2 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        No Telefon 1 <span className="text-red-500">*</span>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        No Telefon 2 <span className="text-red-500">*</span>
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
                            </div>

                            {/* Alamat */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Alamat <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Alamat penuh pelanggan"
                                    rows={3}
                                    className="input-field resize-none"
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Negeri */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Negeri <span className="text-xs text-gray-400 font-normal">(tidak wajib)</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    placeholder="Terengganu"
                                    className="input-field"
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Kata Laluan */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Kata Laluan <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Minimum 6 aksara"
                                        className="input-field pr-10"
                                        disabled={isSubmitting}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Pelanggan akan gunakan No IC dan kata laluan ini untuk log masuk.</p>
                            </div>

                            {/* Submit */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowAddModal(false); resetForm(); }}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                    disabled={isSubmitting}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4" />
                                            Daftar Pelanggan
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {userToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300" onClick={() => !isDeleting && setUserToDelete(null)}>
                    <div
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header Warning Strip */}
                        <div className="h-2 w-full bg-gradient-to-r from-red-500 to-rose-600"></div>
                        
                        <div className="p-8 text-center relative">
                            {/* Close Button */}
                            <button 
                                onClick={() => setUserToDelete(null)}
                                disabled={isDeleting}
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="relative w-20 h-20 mx-auto mb-6">
                                <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-70"></div>
                                <div className="relative w-full h-full bg-red-100 text-red-600 rounded-full flex items-center justify-center border-4 border-white shadow-sm mx-auto">
                                    <Trash2 className="w-8 h-8" />
                                </div>
                            </div>
                            
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('admin_users.delete_title') || 'Padam Pelanggan'}</h2>
                            
                            <div className="bg-red-50 rounded-xl p-4 mb-8 text-left border border-red-100">
                                <p className="text-gray-700 text-sm leading-relaxed text-center">
                                    Adakah anda pasti untuk memadam pelanggan <span className="font-bold text-gray-900">{userToDelete.name}</span>? 
                                    <br/>
                                    <span className="text-red-600 font-semibold mt-1 inline-block">Tindakan ini tidak boleh diundur.</span>
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setUserToDelete(null)}
                                    disabled={isDeleting}
                                    className="flex-1 px-5 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors focus:ring-4 focus:ring-gray-100 focus:outline-none"
                                >
                                    {t('common_actions.cancel') || 'Batal'}
                                </button>
                                <button
                                    onClick={confirmDeleteUser}
                                    disabled={isDeleting}
                                    className="flex-1 px-5 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold rounded-xl shadow-lg shadow-red-500/30 transition-all focus:ring-4 focus:ring-red-500/50 focus:outline-none flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {isDeleting ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        t('admin_users.btn_delete') || 'Ya, Padam'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout >
    );
}
