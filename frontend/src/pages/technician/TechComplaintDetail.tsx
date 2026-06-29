import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, User, Clock, Save, Printer, Edit2, Trash2, Eye, Download } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import { Complaint, ComplaintRemark, TechnicianRemark } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function TechComplaintDetail() {
    const { t, i18n } = useTranslation();
    const { id } = useParams();
    const [complaint, setComplaint] = useState<Complaint | null>(null);
    const [adminRemarks, setAdminRemarks] = useState<ComplaintRemark[]>([]);
    const [techRemarks, setTechRemarks] = useState<TechnicianRemark[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [remarkData, setRemarkData] = useState({
        status: '',
        note_transport: '',
        checking: '',
        remark: '',
    });

    useEffect(() => {
        loadComplaint();
    }, [id]);

    const loadComplaint = async () => {
        try {
            const response = await api.get(`/complaints/${id}`);
            setComplaint(response.data.complaint);
            setAdminRemarks(response.data.adminRemarks);
            setTechRemarks(response.data.techRemarks);
        } catch (error) {
            toast.error(t('common.error_load'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddRemark = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!remarkData.remark && !remarkData.status) {
            toast.error(t('technician_dashboard.error_remark_input'));
            return;
        }

        if (remarkData.status === 'incomplete' && !remarkData.remark.trim()) {
            toast.error('Sila masukkan Remark untuk menjelaskan sebab bawa pulang / tidak siap.');
            return;
        }

        if (remarkData.status === 'incomplete' && !remarkData.note_transport.trim()) {
            toast.error('Sila masukkan maklumat jarak/transport sebelum menukar status kepada Incomplete.');
            return;
        }

        setIsSaving(true);
        try {
            if (editingId) {
                // Update existing remark
                await api.put(`/complaints/remarks/${editingId}`, remarkData);
                toast.success('Catatan berjaya dikemaskini');
            } else {
                // Create new remark
                await api.post(`/complaints/${id}/remark`, remarkData);
                toast.success(t('technician_dashboard.success_remark'));
            }

            setRemarkData({ status: '', note_transport: '', checking: '', remark: '' });
            setEditingId(null);
            loadComplaint();
        } catch (error: any) {
            const errResponse = error.response?.data;
            if (errResponse?.details && Array.isArray(errResponse.details)) {
                const detailsStr = errResponse.details.map((d: any) => `${d.field}: ${d.message}`).join(', ');
                toast.error(`Validation failed: ${detailsStr}`);
            } else {
                toast.error(errResponse?.error || t('technician_dashboard.error_save_remark'));
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditRemark = (remark: TechnicianRemark) => {
        setRemarkData({
            status: remark.status || '',
            note_transport: remark.note_transport || '',
            checking: remark.checking || '',
            remark: remark.remark || '',
        });
        setEditingId(remark.id);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteRemark = async (remarkId: number) => {
        if (!window.confirm('Adakah anda pasti mahu memadam catatan ini?')) return;

        try {
            await api.delete(`/complaints/remarks/${remarkId}`);
            toast.success('Catatan berjaya dipadam');
            loadComplaint();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal memadam catatan');
        }
    };

    const cancelEdit = () => {
        setRemarkData({ status: '', note_transport: '', checking: '', remark: '' });
        setEditingId(null);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="badge badge-pending text-base px-4 py-1">{t('admin_users.status_pending')}</span>;
            case 'in_process':
                return <span className="badge badge-in-process text-base px-4 py-1">{t('admin_users.status_in_process')}</span>;
            case 'closed':
                return <span className="badge badge-closed text-base px-4 py-1">{t('admin_users.status_closed')}</span>;
            default:
                return null;
        }
    };

    // Download file from URL (works for cross-origin)
    const handleDownload = async (url: string, filename: string) => {
        try {
            toast.loading('Memuat turun...', { id: 'download' });
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            toast.success('Muat turun berjaya!', { id: 'download' });
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('Gagal memuat turun fail', { id: 'download' });
        }
    };

    const formatDate = (dateString: string) => {
        const locale = i18n.language === 'ms' ? 'ms-MY' : 'en-US';
        return new Date(dateString).toLocaleDateString(locale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading) {
        return (
            <AdminLayout title={t('technician_dashboard.title_details')} breadcrumb={t('technician_dashboard.title_details')}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
                </div>
            </AdminLayout>
        );
    }

    if (!complaint) {
        return (
            <AdminLayout title={t('technician_dashboard.title_details')} breadcrumb={t('technician_dashboard.title_details')}>
                <div className="text-center py-12">
                    <p className="text-gray-500">{t('admin_master.no_data')}</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title={t('technician_dashboard.title_details')} breadcrumb={t('technician_dashboard.title_details')}>
            {/* Back Button */}
            <div className="flex justify-between items-center mb-6">
                <Link
                    to="/admin/technician/complaints"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('common_actions.back_to_list')}
                </Link>
                <Link
                    to={`/admin/technician/complaint/${id}/track-repair`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                    <Clock className="w-4 h-4" />
                    Track Repair
                </Link>
                <Link
                    to={`/admin/print/${id}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Printer className="w-4 h-4" />
                    {t('common_actions.print_report')}
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Complaint Details */}
                    <div className="card">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <p className="text-sm text-gray-500">{t('admin_users.report_no')}</p>
                                <h2 className="text-2xl font-bold text-gray-800">{complaint.report_number}</h2>
                            </div>
                            {getStatusBadge(complaint.status)}
                        </div>

                        {/* Customer Info */}
                        <div className="p-4 bg-gray-50 rounded-lg mb-6">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {t('complaint_list.customer')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500">{t('user_dashboard.label_full_name')}</p>
                                    <p className="font-medium">{complaint.users?.full_name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">{t('user_dashboard.label_phone1')}</p>
                                    <p className="font-medium">{complaint.users?.contact_no || '-'}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="text-gray-500">{t('user_dashboard.label_address')}</p>
                                    <p className="font-medium">{complaint.users?.address || '-'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Complaint Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">{t('admin_master.category')}</p>
                                <p className="font-medium">{complaint.categories?.name || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('admin_master.subcategory')}</p>
                                <p className="font-medium">{complaint.subcategory}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('admin_master.brand')}</p>
                                <p className="font-medium">{complaint.brand_name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('user_dashboard.label_model_no')}</p>
                                <p className="font-medium">{complaint.model_no || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('user_dashboard.label_purchase_location')}</p>
                                <p className="font-medium">{complaint.state}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('user_dashboard.label_warranty_type')}</p>
                                <p className="font-medium">{complaint.complaint_type}</p>
                            </div>
                        </div>

                        {/* Documents */}
                        {(complaint.warranty_file || complaint.receipt_file) && (
                            <div className="mt-6 pt-6 border-t">
                                <p className="text-sm text-gray-500 mb-4">{t('user_dashboard.label_documents')}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {complaint.warranty_file && (
                                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-blue-700">{t('user_dashboard.label_warranty_doc')}</p>
                                                    <p className="text-xs text-blue-500">Document</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <a
                                                    href={complaint.warranty_file}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-blue-500 hover:text-indigo-600 hover:bg-white rounded-full transition-all shadow-sm"
                                                    title="View"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </a>
                                                <button
                                                    onClick={() => handleDownload(complaint.warranty_file!, `Warranty-${complaint.report_number}.png`)}
                                                    className="p-2 text-blue-500 hover:text-green-600 hover:bg-white rounded-full transition-all shadow-sm"
                                                    title="Download"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {complaint.receipt_file && (
                                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-green-700">{t('user_dashboard.label_receipt')}</p>
                                                    <p className="text-xs text-green-500">Document</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <a
                                                    href={complaint.receipt_file}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-green-500 hover:text-indigo-600 hover:bg-white rounded-full transition-all shadow-sm"
                                                    title="View"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </a>
                                                <button
                                                    onClick={() => handleDownload(complaint.receipt_file!, `Receipt-${complaint.report_number}.png`)}
                                                    className="p-2 text-green-500 hover:text-green-600 hover:bg-white rounded-full transition-all shadow-sm"
                                                    title="Download"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 pt-6 border-t">
                            <p className="text-sm text-gray-500 mb-2">{t('user_dashboard.label_defect_details')}</p>
                            <p className="text-gray-700 whitespace-pre-wrap">{complaint.details}</p>
                        </div>
                    </div>

                    {/* Add Remark Form */}
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-4">{t('technician_dashboard.add_remark_title')}</h3>

                        {/* Show limit warning only if NOT editing and limit reached */}
                        {(adminRemarks.length + techRemarks.length) >= 3 && !editingId ? (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                                <strong className="font-bold">Limit Reached: </strong>
                                <span className="block sm:inline">Maximum 3 remarks allowed per complaint.</span>
                            </div>
                        ) : (
                            <form onSubmit={handleAddRemark} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('common_actions.status')}</label>
                                        <select
                                            value={remarkData.status}
                                            onChange={(e) => setRemarkData({ ...remarkData, status: e.target.value })}
                                            className="input-field"
                                        >
                                            <option value="">-- {t('common.select') || 'Select'} {t('common_actions.status')} --</option>
                                            <option value="pending">{t('admin_users.status_pending')}</option>
                                            <option value="in_process">{t('admin_users.status_in_process')}</option>
                                            <option value="incomplete">Incomplete / Bawa Pulang</option>
                                            <option value="ready_pickup">Sedia Diambil / Ready Pickup</option>
                                            <option value="closed">{t('admin_users.status_closed')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('technician_dashboard.label_transport_note')}</label>
                                        <input
                                            type="text"
                                            value={remarkData.note_transport}
                                            onChange={(e) => setRemarkData({ ...remarkData, note_transport: e.target.value })}
                                            className="input-field"
                                            placeholder={t('technician_dashboard.placeholder_transport')}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('technician_dashboard.label_checking')}</label>
                                    <input
                                        type="text"
                                        value={remarkData.checking}
                                        onChange={(e) => setRemarkData({ ...remarkData, checking: e.target.value })}
                                        className="input-field"
                                        placeholder={t('technician_dashboard.placeholder_checking')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('technician_dashboard.label_remark')}</label>
                                    <textarea
                                        value={remarkData.remark}
                                        onChange={(e) => setRemarkData({ ...remarkData, remark: e.target.value })}
                                        rows={3}
                                        className="input-field resize-none"
                                        placeholder={t('technician_dashboard.placeholder_remark')}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" disabled={isSaving} className="btn-success flex items-center gap-2">
                                        {isSaving ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                {editingId ? 'Kemaskini Catatan' : t('technician_dashboard.btn_save_remark')}
                                            </>
                                        )}
                                    </button>
                                    {editingId && (
                                        <button type="button" onClick={cancelEdit} className="btn-secondary">
                                            Batal
                                        </button>
                                    )}
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Timeline */}
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            {t('user_dashboard.label_timeline')}
                        </h3>

                        {adminRemarks.length === 0 && techRemarks.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">{t('user_dashboard.no_remarks')}</p>
                        ) : (
                            <div className="space-y-4">
                                {[...adminRemarks.map(r => ({ ...r, type: 'admin' })), ...techRemarks.map(r => ({ ...r, type: 'tech' }))]
                                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                    .map((remark) => (
                                        <div key={`${remark.type}-${remark.id}`} className="relative pl-6 pb-4 border-l-2 border-gray-200 last:border-0">
                                            <div className={`absolute -left-2 w-4 h-4 rounded-full ${remark.type === 'admin' ? 'bg-indigo-500' : 'bg-green-500'}`}></div>
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`text-xs font-medium px-2 py-1 rounded ${remark.type === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                                                        {remark.type === 'admin' ? 'Admin' : t('roles.technician')}
                                                    </span>

                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-gray-500">{formatDate(remark.created_at)}</span>

                                                        {/* Action Buttons for Technician */}
                                                        {remark.type === 'tech' && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        console.log('Edit clicked for remark:', remark);
                                                                        handleEditRemark(remark as any);
                                                                    }}
                                                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition-colors"
                                                                >
                                                                    <Edit2 className="w-3 h-3" />
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        console.log('Delete clicked for remark:', remark);
                                                                        handleDeleteRemark(remark.id);
                                                                    }}
                                                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {remark.status && (
                                                    <p className="text-sm mb-1"><strong>{t('common_actions.status')}:</strong> {remark.status === 'pending' ? t('admin_users.status_pending') : remark.status === 'in_process' ? t('admin_users.status_in_process') : remark.status === 'incomplete' ? 'Incomplete / Bawa Pulang' : remark.status === 'ready_pickup' ? 'Sedia Diambil / Ready Pickup' : remark.status === 'cancelled' ? 'Dibatalkan' : t('admin_users.status_closed')}</p>
                                                )}
                                                {/* Special display for Incomplete / Bawa Pulang */}
                                                {remark.status === 'incomplete' ? (
                                                    <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-1.5">
                                                        <p className="text-sm text-orange-800"><strong>🔧 Juruteknik:</strong> {remark.type === 'tech' && (remark as any).technicians?.name ? (remark as any).technicians.name : '-'}</p>
                                                        <p className="text-sm text-orange-800"><strong>📍 Lokasi:</strong> {complaint?.users?.address || '-'}</p>
                                                        <p className="text-sm text-orange-800"><strong>📅 Tarikh:</strong> {formatDate(remark.created_at)}</p>
                                                        <p className="text-sm text-orange-800"><strong>📝 Sebab Bawa Pulang:</strong> {remark.remark || '-'}</p>
                                                        {remark.note_transport && <p className="text-sm text-orange-800"><strong>🚗 Transport Note:</strong> {remark.note_transport}</p>}
                                                    </div>
                                                ) : (
                                                    <>
                                                        {remark.remark && <p className="text-gray-700">{remark.remark}</p>}
                                                        {remark.note_transport && <p className="text-sm text-gray-600 mt-1"><strong>{t('technician_dashboard.label_transport_note')}:</strong> {remark.note_transport}</p>}
                                                        {remark.checking && <p className="text-sm text-gray-600 mt-1"><strong>{t('technician_dashboard.label_checking')}:</strong> {remark.checking}</p>}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Dates */}
                    <div className="card">
                        <h3 className="font-semibold mb-4">{t('common_actions.date')}</h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-gray-500">{t('user_dashboard.label_date_created')}</p>
                                <p className="font-medium">{formatDate(complaint.created_at)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">{t('user_dashboard.label_date_updated')}</p>
                                <p className="font-medium">{formatDate(complaint.updated_at)}</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </AdminLayout>
    );
}
