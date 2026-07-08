import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { Send, Upload, X, ArrowLeft, UserCheck, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { Category, Subcategory, Brand, State } from '../../types';
import toast from 'react-hot-toast';

interface VerifiedUser {
    id: string;
    full_name: string;
    ic_number: string;
    contact_no: string;
    address: string;
    state: string;
}

export default function PublicComplaint() {
    const [searchParams] = useSearchParams();
    const { t } = useTranslation();
    const categoryType = searchParams.get('type') || 'kerosakan'; // kerosakan, aircond, cucian

    // Step 1: IC Verification
    const [icNumber, setIcNumber] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifiedUser, setVerifiedUser] = useState<VerifiedUser | null>(null);
    const [tempToken, setTempToken] = useState('');
    const [verificationError, setVerificationError] = useState('');

    // Step 2: Complaint Form
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

    // Get title based on type
    const getTitle = () => {
        switch (categoryType) {
            case 'aircond': return t('landing.service_aircond');
            case 'cucian': return t('landing.service_cleaning');
            default: return t('landing.report_damage');
        }
    };

    // Get default category ID based on type
    const getDefaultCategoryId = () => {
        switch (categoryType) {
            case 'aircond': return '2'; // SERVIS AIRCOND
            case 'cucian': return '3'; // SERVIS CUCIAN
            default: return '1'; // LAPORAN KEROSAKAN PELANGGAN
        }
    };

    useEffect(() => {
        if (verifiedUser) {
            loadMasterData();
        }
    }, [verifiedUser]);

    useEffect(() => {
        if (formData.category_id) {
            loadSubcategories(parseInt(formData.category_id));
        }
    }, [formData.category_id]);

    const handleVerifyIC = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerificationError('');

        if (!icNumber || icNumber.length !== 12) {
            setVerificationError(t('user_login.error_ic_format'));
            return;
        }

        setIsVerifying(true);
        try {
            const response = await api.post('/auth/verify-ic', { ic_number: icNumber });

            if (response.data.registered) {
                setVerifiedUser(response.data.user);
                setTempToken(response.data.token);
                // Set default category based on type
                setFormData({ ...formData, category_id: getDefaultCategoryId() });
                toast.success(t('complaint_form.success_verified'));
            }
        } catch (error: any) {
            setVerificationError(error.response?.data?.error || t('complaint_form.error_verify_failed'));
        } finally {
            setIsVerifying(false);
        }
    };

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
            toast.error(t('common.error_load') || 'Failed to load data');
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
            if (file.type && !['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'image/heic'].includes(file.type)) {
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

        // Check file uploads (already handled by logic, but adding alert)
        // Actually the logic 'Under Warranty' check is below.

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
                    'Authorization': `Bearer ${tempToken}`,
                },
            });

            // Store auth data in localStorage so user can access dashboard
            localStorage.setItem('token', tempToken);
            localStorage.setItem('user', JSON.stringify({
                id: verifiedUser?.id,
                full_name: verifiedUser?.full_name,
                ic_number: verifiedUser?.ic_number,
                contact_no: verifiedUser?.contact_no,
                address: verifiedUser?.address,
                state: verifiedUser?.state,
            }));
            localStorage.setItem('role', 'user');

            toast.success(t('complaint_form.success_submitted', { report_number: response.data.report_number }));

            // Use window.location to force full page reload so AuthContext recognizes the new auth state
            window.location.href = '/users/dashboard';
        } catch (error: any) {
            toast.error(error.response?.data?.error || t('complaint_form.error_submit_failed'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-indigo-900">
            {/* Header */}
            <div className="bg-dark-900/50 backdrop-blur-sm border-b border-white/10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link
                        to="/"
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <img src="/favicon.png" alt="E-CARE" className="w-10 h-10 rounded-full" />
                        <div>
                            <h1 className="text-white font-bold">{getTitle()}</h1>
                            <p className="text-white/60 text-sm">PTA SERVICES - E-CARE</p>
                        </div>
                    </div>
                    <div className="ml-auto">
                        <LanguageSwitcher className="text-white hover:bg-white/10" />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-2xl mx-auto px-4 py-8">
                {!verifiedUser ? (
                    /* Step 1: IC Verification */
                    <div className="bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <UserCheck className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">{t('complaint_form.verify_customer')}</h2>
                            <p className="text-gray-500 mt-1">{t('complaint_form.verify_desc')}</p>
                        </div>

                        <form onSubmit={handleVerifyIC} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('user_login.ic_no')}
                                </label>
                                <input
                                    type="text"
                                    value={icNumber}
                                    onChange={(e) => {
                                        setIcNumber(e.target.value.replace(/\D/g, '').slice(0, 12));
                                        setVerificationError('');
                                    }}
                                    placeholder={t('user_login.placeholder_ic')}
                                    className="input-field text-lg text-center tracking-widest"
                                    maxLength={12}
                                />
                                <p className="text-xs text-gray-500 mt-1 text-center">
                                    {t('user_login.error_ic_format')}
                                </p>
                            </div>

                            {verificationError && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-red-700 font-medium">{verificationError}</p>
                                        <Link
                                            to="/users/register"
                                            className="text-sm text-red-600 hover:text-red-700 underline mt-1 inline-block"
                                        >
                                            {t('complaint_form.register')}
                                        </Link>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isVerifying || icNumber.length !== 12}
                                className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isVerifying ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <UserCheck className="w-5 h-5" />
                                        {t('complaint_form.verify_btn')}
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="text-center text-gray-500 mt-6 text-sm">
                            {t('complaint_form.no_account')}{' '}
                            <Link to="/users/register" className="text-indigo-600 hover:text-indigo-700 font-medium">
                                {t('complaint_form.register')}
                            </Link>
                        </p>
                    </div>
                ) : (
                    /* Step 2: Complaint Form */
                    <div className="bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* User Info (readonly) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">{t('complaint_form.full_name')}</label>
                                    <p className="font-medium text-gray-800">{verifiedUser.full_name}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">{t('complaint_form.ic_no')}</label>
                                    <p className="font-medium text-gray-800">{verifiedUser.ic_number}</p>
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
                                    className="input-field"
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
                                    className="input-field"
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
                                    className="input-field"
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
                                    {t('complaint_form.purchase_location')} <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    className="input-field"
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
                                    placeholder="Contoh: ABC-1234"
                                    className="input-field"
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
                                    placeholder="Terangkan masalah kerosakan secara terperinci..."
                                    rows={4}
                                    maxLength={2000}
                                    className="input-field resize-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">{formData.details.length}/2000 aksara</p>
                            </div>

                            {/* Warranty Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('complaint_form.warranty_type')} <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.complaint_type}
                                    onChange={(e) => setFormData({ ...formData, complaint_type: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="">-- {t('complaint_form.select_warranty')} --</option>
                                    <option value="Under Warranty">Under Warranty (Dalam Waranti)</option>
                                    <option value="Over Warranty">Over Warranty (Tamat Waranti)</option>
                                </select>
                            </div>

                            {/* File Uploads (only for Under Warranty) */}
                            {formData.complaint_type === 'Under Warranty' && (
                                <div className="space-y-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <p className="text-sm text-yellow-800 font-medium">
                                        {t('complaint_form.warranty_warning')}
                                    </p>

                                    {/* Warranty Document */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('complaint_form.warranty_doc')} <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <label className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer flex items-center gap-2 transition-colors">
                                                <Upload className="w-4 h-4" />
                                                {t('complaint_form.upload_file')}
                                                <input
                                                    type="file"
                                                    accept="image/*,application/pdf"
                                                    onChange={(e) => handleFileChange(e, 'warranty')}
                                                    className="hidden"
                                                />
                                            </label>
                                            {warrantyFile && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <span>{warrantyFile.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setWarrantyFile(null)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <X className="w-4 h-4" />
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
                                            <label className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer flex items-center gap-2 transition-colors">
                                                <Upload className="w-4 h-4" />
                                                {t('complaint_form.upload_file')}
                                                <input
                                                    type="file"
                                                    accept="image/*,application/pdf"
                                                    onChange={(e) => handleFileChange(e, 'receipt')}
                                                    className="hidden"
                                                />
                                            </label>
                                            {receiptFile && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <span>{receiptFile.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setReceiptFile(null)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{t('complaint_form.format_hint')}</p>
                                    </div>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        {t('complaint_form.submit')}
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {/* Footer */}
                <footer className="text-center text-sm text-white/60 mt-8">
                    © 2026 DFKTVETMARABESUT. All rights reserved.
                </footer>
            </div>
        </div>
    );
}
