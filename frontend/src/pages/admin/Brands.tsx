import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import { Brand, Category } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function Brands() {
    const { t } = useTranslation();
    const [brands, setBrands] = useState<Brand[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ name: '', category_id: '' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [brandRes, catRes] = await Promise.all([
                api.get('/brands'),
                api.get('/categories'),
            ]);
            setBrands(brandRes.data.brands);
            setCategories(catRes.data.categories);
        } catch (error) {
            toast.error(t('common.error_load'));
        } finally {
            setIsLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingId(null);
        setFormData({ name: '', category_id: '' });
        setShowModal(true);
    };

    const openEditModal = (brand: Brand) => {
        setEditingId(brand.id);
        setFormData({ name: brand.name, category_id: brand.category_id?.toString() || '' });
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
                await api.put(`/brands/${editingId}`, {
                    name: formData.name,
                    category_id: formData.category_id ? parseInt(formData.category_id) : null,
                });
                toast.success(t('admin_master.success_update'));
            } else {
                await api.post('/brands', {
                    name: formData.name,
                    category_id: formData.category_id ? parseInt(formData.category_id) : null,
                });
                toast.success(t('admin_master.success_add'));
            }
            setShowModal(false);
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || t('common.error_load'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('admin_master.delete_confirm'))) return;

        try {
            await api.delete(`/brands/${id}`);
            toast.success(t('admin_master.success_delete'));
            setBrands(brands.filter(b => b.id !== id));
        } catch (error: any) {
            toast.error(error.response?.data?.error || t('common.error_load'));
        }
    };

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const filteredBrands = brands.filter(b =>
        b.name.toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.ceil(filteredBrands.length / itemsPerPage);
    const displayedBrands = filteredBrands.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    return (
        <AdminLayout title={t('admin_master.title_brands')} breadcrumb={t('admin_master.title_brands')}>
            <div className="card">
                <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            placeholder={t('admin_master.search_brands')}
                            className="input-field pl-10"
                        />
                    </div>
                    <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        {t('admin_master.add_brand')}
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                    </div>
                ) : filteredBrands.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">{t('admin_master.no_data')}</p>
                    </div>
                ) : (<>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="table-header">
                                    <th className="text-left px-4 py-3 whitespace-nowrap">#</th>
                                    <th className="text-left px-4 py-3 whitespace-nowrap">{t('common_actions.name')}</th>
                                    <th className="text-left px-4 py-3 whitespace-nowrap">{t('admin_master.category')}</th>
                                    <th className="text-center px-4 py-3 whitespace-nowrap">{t('common_actions.action')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedBrands.map((brand, index) => (
                                    <tr key={brand.id} className="table-row">
                                        <td className="px-4 py-3 text-gray-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                        <td className="px-4 py-3 font-medium">{brand.name}</td>
                                        <td className="px-4 py-3 text-gray-600">{brand.categories?.name || t('admin_master.all_categories')}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openEditModal(brand)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title={t('common_actions.edit')}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(brand.id)}
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

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold mb-4">{editingId ? t('admin_master.edit_brand') : t('admin_master.add_brand')}</h3>
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin_master.category')} ({t('common.optional') || 'Optional'})</label> {/* "Kategori (Pilihan)" */}
                                <select
                                    value={formData.category_id}
                                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="">{t('admin_master.all_categories')}</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
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
