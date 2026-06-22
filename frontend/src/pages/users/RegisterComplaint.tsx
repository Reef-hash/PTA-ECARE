import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Upload, X } from 'lucide-react';
import UserLayout from '../../components/UserLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Category, Subcategory, Brand, State } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function RegisterComplaint() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [states, setStates] = useState<State[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        category_id: '',
        subcategory: '',
        brand_name: '',
        state: '',
        model_no: '',
        details: '',
        complaint_type: '',
    });

    const [warrantyFile, setWarrantyFile] = useState<File | null>(null);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);

    useEffect(() => {
        loadMasterData();
    }, []);

    useEffect(() => {
        if (formData.category_id) {
            loadSubcategories(parseInt(formData.category_id));
        }
    }, [formData.category_id]);

    const loadMasterData = async () => {
        try {
            const [catRes, brandRes, stateRes] = await Promise.all([
                api.get('/categories'),
                api.get('/brands'),
                api.get('/states'),
            ]);
            setCategories(catRes.data.categories);
            setBrands(brandRes.data.brands);
            setStates(stateRes.data.states);
        } catch (error) {
            toast.error(t('common.error_load'));
        }
    };

    const loadSubcategories = async (categoryId: number) => {
        try {
            const response = await api.get(`/subcategories?categoryId=${categoryId}`);
            setSubcategories(response.data.subcategories);
        } catch (error) {
            console.error('Failed to load subcategories');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'warranty' | 'receipt') => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error(t('complaint_form.error_file_size'));
                return;
            }
            if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
                toast.error(t('complaint_form.error_file_format'));
                return;
            }
            if (type === 'warranty') {
                setWarrantyFile(file);
            } else {
                setReceiptFile(file);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.category_id || !formData.subcategory || !formData.brand_name ||
            !formData.state || !formData.details || !formData.complaint_type) {
            toast.error(t('complaint_form.error_required'));
            return;
        }

        if (formData.complaint_type === 'Under Warranty' && !formData.model_no) {
            toast.error('No Model wajib diisi untuk aduan Under Warranty.');
            return;
        }

        if (formData.details.length > 2000) {
            toast.error(t('complaint_form.error_details_length'));
            return;
        }

        if (formData.complaint_type === 'Under Warranty' && (!warrantyFile || !receiptFile)) {
            toast.error(t('complaint_form.error_documents'));
            return;
        }

        setIsLoading(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('category_id', formData.category_id);
            formDataToSend.append('subcategory', formData.subcategory);
            formDataToSend.append('complaint_type', formData.complaint_type);
            formDataToSend.append('state', formData.state);
            formDataToSend.append('brand_name', formData.brand_name);
            formDataToSend.append('model_no', formData.model_no);
            formDataToSend.append('details', formData.details);

            if (warrantyFile) {
                formDataToSend.append('warranty_file', warrantyFile);
            }
            if (receiptFile) {
                formDataToSend.append('receipt_file', receiptFile);
            }

            const response = await api.post('/complaints', formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            toast.success(t('complaint_form.success_submitted', { report_number: response.data.report_number }));
            navigate('/users/complaint-history');
        } catch (error: any) {
            toast.error(error.response?.data?.error || t('complaint_form.error_submit_failed'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <UserLayout title={t('user_dashboard.new_complaint')} breadcrumb={t('user_dashboard.new_complaint')}>
            <div className="max-w-3xl mx-auto">
                <div className="card shadow-xl border border-gray-100/50">
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 flex items-start gap-3">
                        <div className="bg-blue-100 p-2 rounded-full">
                            <Send className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-blue-900">Perlukan Bantuan?</h3>
                            <p className="text-sm text-blue-700 mt-1">Sila isi borang di bawah dengan lengkap untuk memudahkan urusan tuntutan waranti atau servis.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* User Info (readonly) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200/60">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">{t('user_dashboard.label_full_name')}</label>
                                <p className="font-medium text-gray-800">{user?.full_name}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">{t('user_dashboard.label_ic')}</label>
                                <p className="font-medium text-gray-800">{user?.ic_number}</p>
                            </div>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('complaint_form.category')} <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.category_id}
                                onChange={(e) => setFormData({ ...formData, category_id: e.target.value, subcategory: '' })}
                                className="input-field border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="">-- {t('complaint_form.select_category')} --</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Subcategory */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('complaint_form.subcategory')} <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.subcategory}
                                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                                className="input-field border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                disabled={!formData.category_id}
                            >
                                <option value="">-- {t('complaint_form.select_subcategory')} --</option>
                                {subcategories.map((sub) => (
                                    <option key={sub.id} value={sub.name}>{sub.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Brand */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('complaint_form.brand')} <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.brand_name}
                                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                                className="input-field border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="">-- {t('complaint_form.select_brand')} --</option>
                                {brands.map((brand) => (
                                    <option key={brand.id} value={brand.name}>{brand.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* State */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('user_dashboard.label_purchase_location')} <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.state}
                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                className="input-field border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="">-- {t('complaint_form.select_location')} --</option>
                                {states.map((state) => (
                                    <option key={state.id} value={state.name}>{state.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Model */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('complaint_form.model_no')} {formData.complaint_type === 'Under Warranty' && <span className="text-red-500">*</span>}
                            </label>
                            <input
                                type="text"
                                value={formData.model_no}
                                onChange={(e) => setFormData({ ...formData, model_no: e.target.value })}
                                placeholder={t('complaint_form.placeholder_model')}
                                className="input-field border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                            {formData.complaint_type === 'Over Warranty' && (
                                <p className="text-xs text-gray-500 mt-1">Tidak wajib untuk aduan Over Warranty</p>
                            )}
                        </div>

                        {/* Details */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('complaint_form.details')} <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={formData.details}
                                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                                placeholder={t('complaint_form.placeholder_details')}
                                rows={4}
                                maxLength={2000}
                                className="input-field resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">{formData.details.length}/2000</p>
                        </div>

                        {/* Warranty Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('complaint_form.warranty_type')} <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.complaint_type}
                                onChange={(e) => setFormData({ ...formData, complaint_type: e.target.value })}
                                className="input-field border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="">-- {t('complaint_form.select_warranty')} --</option>
                                <option value="Under Warranty">Under Warranty (Dalam Waranti)</option>
                                <option value="Over Warranty">Over Warranty (Tamat Waranti)</option>
                            </select>
                        </div>

                        {/* File Uploads (only for Under Warranty) */}
                        {formData.complaint_type === 'Under Warranty' && (
                            <div className="space-y-4 p-5 bg-yellow-50 rounded-xl border border-yellow-200 transition-all animate-fade-in shadow-sm">
                                <p className="text-sm text-yellow-800 font-medium flex items-center gap-2">
                                    <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-0.5 rounded-full">Penting</span>
                                    {t('complaint_form.warn_warranty')}
                                </p>

                                {/* Warranty Document */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('complaint_form.warranty_doc')} <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <label className="btn-secondary cursor-pointer flex items-center gap-2 hover:bg-gray-300 transition-colors">
                                            <Upload className="w-4 h-4" />
                                            {t('complaint_form.upload_file')}
                                            <input
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.pdf"
                                                onChange={(e) => handleFileChange(e, 'warranty')}
                                                className="hidden"
                                            />
                                        </label>
                                        {warrantyFile && (
                                            <div className="flex items-center gap-2 text-sm bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                                                <span className="text-gray-700 font-medium">{warrantyFile.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setWarrantyFile(null)}
                                                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-full transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{t('complaint_form.format_hint')}</p>
                                </div>

                                {/* Receipt */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('complaint_form.receipt')} <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <label className="btn-secondary cursor-pointer flex items-center gap-2 hover:bg-gray-300 transition-colors">
                                            <Upload className="w-4 h-4" />
                                            {t('complaint_form.upload_file')}
                                            <input
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.pdf"
                                                onChange={(e) => handleFileChange(e, 'receipt')}
                                                className="hidden"
                                            />
                                        </label>
                                        {receiptFile && (
                                            <div className="flex items-center gap-2 text-sm bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                                                <span className="text-gray-700 font-medium">{receiptFile.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setReceiptFile(null)}
                                                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-full transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{t('complaint_form.format_hint')}</p>
                                </div>
                            </div>
                        )}

                        {/* Submit */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {isLoading ? (
                                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        <span className="text-lg tracking-wide">{t('complaint_form.submit')}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </UserLayout>
    );
}
