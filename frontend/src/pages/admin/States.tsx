import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import { State } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function States() {
    const { t } = useTranslation();
    const [states, setStates] = useState<State[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadStates();
    }, []);

    const loadStates = async () => {
        try {
            const response = await api.get('/states');
            setStates(response.data.states);
        } catch (error) {
            toast.error(t('common.error_load'));
        } finally {
            setIsLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingId(null);
        setFormData({ name: '', description: '' });
        setShowModal(true);
    };

    const openEditModal = (state: State) => {
        setEditingId(state.id);
        setFormData({ name: state.name, description: state.description || '' });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            toast.error(t('admin_master.name_required') || 'Sila masukkan nama');
            return;
        }

        setIsSaving(true);
        try {
            if (editingId) {
                await api.put(`/states/${editingId}`, formData);
                toast.success(t('admin_master.success_update'));
            } else {
                await api.post('/states', formData);
                toast.success(t('admin_master.success_add'));
            }
            setShowModal(false);
            loadStates();
        } catch (error: any) {
            toast.error(error.response?.data?.error || t('common.error_load'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('admin_master.delete_confirm'))) return;

        try {
            await api.delete(`/states/${id}`);
            toast.success(t('admin_master.success_delete'));
            setStates(states.filter(s => s.id !== id));
        } catch (error: any) {
            toast.error(error.response?.data?.error || t('common.error_load'));
        }
    };

    const filteredStates = states.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AdminLayout title={t('admin_master.title_states')} breadcrumb={t('admin_master.title_states')}>
            <div className="card">
                <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('admin_master.search_states')}
                            className="input-field pl-10"
                        />
                    </div>
                    <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        {t('admin_master.add_state')}
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                    </div>
                ) : filteredStates.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">{t('admin_master.no_data')}</p>
                    </div>
                ) : (
                    <div className="overflow-hidden sm:rounded-lg">
                        {/* Mobile Layout (List-Item Compact) */}
                        <div className="block md:hidden border-t border-gray-200">
                            {filteredStates.map((state, index) => (
                                <div key={state.id} className="bg-white border-b border-gray-200 p-4 last:border-b-0 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400 font-medium text-xs">#{index + 1}</span>
                                            <span className="font-bold text-gray-900 text-sm">{state.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => openEditModal(state)}
                                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100"
                                                title={t('common_actions.edit')}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(state.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                                                title={t('common_actions.delete')}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm items-start">
                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider mt-0.5">{t('common_actions.description')}</span>
                                        <span className="text-gray-600 text-xs line-clamp-2">{state.description || '-'}</span>
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
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('common_actions.description')}</th>
                                        <th className="text-center px-4 py-3 whitespace-nowrap">{t('common_actions.action')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStates.map((state, index) => (
                                        <tr key={state.id} className="table-row">
                                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{index + 1}</td>
                                            <td className="px-4 py-3 font-medium whitespace-nowrap">{state.name}</td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{state.description || '-'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(state)}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title={t('common_actions.edit')}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(state.id)}
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

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold mb-4">{editingId ? t('admin_master.edit_state') : t('admin_master.add_state')}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('common_actions.name')} *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input-field"
                                    placeholder={t('common_actions.name')}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('common_actions.description')}</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input-field resize-none"
                                    rows={3}
                                    placeholder={t('common_actions.description')}
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                                    {t('common_actions.cancel')}
                                </button>
                                <button type="submit" disabled={isSaving} className="btn-primary">
                                    {isSaving ? '...' : t('common_actions.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
