import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function TechnicianForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: '',
        department: '',
        email: '',
        contact_number: '',
        is_active: true,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(isEdit);
    const [showPassword, setShowPassword] = useState(false);

    // Change Password Card states
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    useEffect(() => {
        if (isEdit) {
            loadTechnician();
        }
    }, [id]);

    const loadTechnician = async () => {
        try {
            const response = await api.get(`/admin/technicians/${id}`);
            const tech = response.data.technician;
            setFormData({
                name: tech.name,
                username: tech.username,
                password: '',
                department: tech.department,
                email: tech.email || '',
                contact_number: tech.contact_number?.toString() || '',
                is_active: Boolean(tech.is_active),
            });
        } catch (error) {
            toast.error('Gagal memuatkan data');
            navigate('/admin/technicians');
        } finally {
            setIsFetching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.username || !formData.department) {
            toast.error('Sila lengkapkan maklumat wajib');
            return;
        }

        if (!isEdit && (!formData.password || formData.password.length < 6)) {
            toast.error('Kata laluan mestilah sekurang-kurangnya 6 aksara');
            return;
        }

        setIsLoading(true);
        try {
            if (isEdit) {
                await api.put(`/admin/technicians/${id}`, {
                    name: formData.name,
                    department: formData.department,
                    email: formData.email || undefined,
                    contact_number: formData.contact_number ? parseInt(formData.contact_number) : undefined,
                    is_active: Boolean(formData.is_active),
                });
                toast.success('Juruteknik berjaya dikemaskini');
            } else {
                await api.post('/admin/technicians', {
                    ...formData,
                    contact_number: formData.contact_number ? parseInt(formData.contact_number) : undefined,
                    is_active: Boolean(formData.is_active),
                });
                toast.success('Juruteknik berjaya ditambah');
            }
            navigate('/admin/technicians');
        } catch (error: any) {
            let errorMsg = error.response?.data?.error || 'Operasi gagal';
            if (error.response?.data?.details && Array.isArray(error.response.data.details)) {
                errorMsg = error.response.data.details.map((d: any) => `${d.field}: ${d.message}`).join(', ');
            }
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 6) {
            toast.error('Kata laluan baharu mestilah sekurang-kurangnya 6 aksara');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Kata laluan baharu dan pengesahan kata laluan tidak sepadan');
            return;
        }
        setIsChangingPassword(true);
        try {
            await api.post(`/admin/technicians/${id}/reset-password`, {
                new_password: newPassword,
            });
            toast.success('Kata laluan berjaya dikemaskini');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordSection(false);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal menukar kata laluan');
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (isFetching) {
        return (
            <AdminLayout title={isEdit ? 'Edit Juruteknik' : 'Tambah Juruteknik'} breadcrumb="Technicians">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title={isEdit ? 'Edit Juruteknik' : 'Tambah Juruteknik'} breadcrumb="Technicians">
            <button
                onClick={() => navigate('/admin/technicians')}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Kembali
            </button>

            <div className="max-w-2xl space-y-6">
                <div className="card">
                    <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nama Penuh <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="input-field"
                                placeholder="Nama penuh juruteknik"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Username <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="input-field"
                                placeholder="Username untuk log masuk"
                                disabled={isEdit}
                            />
                            {isEdit && <p className="text-xs text-gray-500 mt-1">Username tidak boleh diubah</p>}
                        </div>

                        {!isEdit && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Kata Laluan <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="input-field pr-10"
                                        placeholder="Minimum 6 aksara"
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
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Jabatan <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                className="input-field"
                                placeholder="Cth: Bahagian Teknikal"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="input-field"
                                placeholder="email@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                No Telefon
                            </label>
                            <input
                                type="tel"
                                value={formData.contact_number}
                                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value.replace(/\D/g, '') })}
                                className="input-field"
                                placeholder="Cth: 0123456789"
                            />
                        </div>

                        {isEdit && (
                            <div className="md:col-span-2">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Aktif</span>
                                </label>
                            </div>
                        )}
                    </div>

                    <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-2">
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                {isEdit ? 'Kemaskini' : 'Simpan'}
                            </>
                        )}
                    </button>
                </form>
            </div>

            {isEdit && (
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <span role="img" aria-label="lock">🔒</span> Change Password
                        </h2>
                        <button
                            type="button"
                            onClick={() => {
                                setShowPasswordSection(!showPasswordSection);
                                if (showPasswordSection) {
                                    setNewPassword('');
                                    setConfirmPassword('');
                                }
                            }}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                            {showPasswordSection ? 'Discard' : 'Change'}
                        </button>
                    </div>

                    {showPasswordSection && (
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="input-field pr-10"
                                        placeholder="••••••••"
                                        required
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

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="input-field pr-10"
                                        placeholder="••••••••"
                                        required
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

                            <div className="pt-4 border-t flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isChangingPassword}
                                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition-all flex items-center gap-2 text-sm uppercase tracking-wider disabled:opacity-50"
                                >
                                    {isChangingPassword ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    UPDATE PASSWORD
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}
            </div>
        </AdminLayout>
    );
}
