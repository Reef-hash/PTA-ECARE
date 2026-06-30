import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ArrowLeft, FileText, User, Clock,
    Forward, Send, Save, Printer, XCircle,
    Download, Eye, Wrench
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import { Complaint, ComplaintRemark, TechnicianRemark, Technician } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function AdminComplaintDetail() {
    const { t, i18n } = useTranslation();
    const { id } = useParams();
    const [complaint, setComplaint] = useState<Complaint | null>(null);
    const [adminRemarks, setAdminRemarks] = useState<ComplaintRemark[]>([]);
    const [techRemarks, setTechRemarks] = useState<TechnicianRemark[]>([]);
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [remarkData, setRemarkData] = useState({
        status: '',
        note_transport: '',
        checking: '',
        remark: '',
    });

    const [forwardTo, setForwardTo] = useState('');
    const [forwardStatus, setForwardStatus] = useState('');

    useEffect(() => {
        loadComplaint();
        loadTechnicians();
    }, [id]);

    const loadComplaint = async () => {
        try {
            const response = await api.get(`/complaints/${id}`);
            setComplaint(response.data.complaint);
            setAdminRemarks(response.data.adminRemarks);
            setTechRemarks(response.data.techRemarks);
        } catch (error) {
            toast.error(t('admin_complaint_detail.error_load'));
        } finally {
            setIsLoading(false);
        }
    };

    const loadTechnicians = async () => {
        try {
            const response = await api.get('/admin/technicians');
            setTechnicians(response.data.technicians.filter((t: Technician) => t.is_active));
        } catch (error) {
            console.error('Failed to load technicians');
        }
    };

    const handleAddRemark = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!remarkData.remark && !remarkData.status) {
            toast.error('Sila masukkan catatan atau status');
            return;
        }

        setIsSaving(true);
        try {
            await api.post(`/complaints/${id}/remark`, remarkData);
            toast.success('Catatan berjaya ditambah');
            setRemarkData({ status: '', note_transport: '', checking: '', remark: '' });
            loadComplaint();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal menambah catatan');
        } finally {
            setIsSaving(false);
        }
    };

    const handleForward = async () => {
        if (!forwardTo) {
            toast.error('Sila pilih juruteknik');
            return;
        }

        setIsSaving(true);
        try {
            if (remarkData.remark || remarkData.status || remarkData.note_transport || remarkData.checking) {
                await api.post(`/complaints/${id}/remark`, {
                    status: forwardStatus || remarkData.status || undefined,
                    note_transport: remarkData.note_transport || undefined,
                    checking: remarkData.checking || undefined,
                    remark: remarkData.remark || undefined,
                });
            }

            await api.post(`/complaints/${id}/forward`, {
                technician_id: forwardTo,
                status: forwardStatus || undefined
            });
            toast.success('Aduan berjaya diagihkan');
            setForwardTo('');
            setForwardStatus('');
            setRemarkData({ status: '', note_transport: '', checking: '', remark: '' });
            loadComplaint();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal mengagihkan aduan');
        } finally {
            setIsSaving(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="badge badge-pending text-base px-4 py-1">{t('admin_users.status_pending')}</span>;
            case 'in_process':
                return <span className="badge badge-in-process text-base px-4 py-1">{t('admin_users.status_in_process')}</span>;
            case 'incomplete':
                return <span className="badge bg-orange-100 text-orange-700 border-orange-200">Incomplete</span>;
            case 'ready_pickup':
                return <span className="badge bg-indigo-100 text-indigo-700 border-indigo-200">Ready Pickup</span>;
            case 'closed':
                return <span className="badge badge-closed text-base px-4 py-1">{t('admin_users.status_closed')}</span>;
            case 'cancelled':
                return <span className="badge bg-purple-100 text-purple-700 text-base px-4 py-1">{t('admin_users.status_cancelled') || 'Dibatalkan'}</span>;
            default:
                return null;
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

    if (isLoading) {
        return (
            <AdminLayout title={t('admin_complaint_detail.title')} breadcrumb={t('admin_complaint_detail.title')}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                </div>
            </AdminLayout>
        );
    }

    if (!complaint) {
        return (
            <AdminLayout title={t('admin_complaint_detail.title')} breadcrumb={t('admin_complaint_detail.title')}>
                <div className="text-center py-12">
                    <p className="text-gray-500">{t('admin_complaint_detail.complaint_not_found')}</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title={t('admin_complaint_detail.title')} breadcrumb={t('admin_complaint_detail.title')}>
            {/* Back Button */}
            <div className="flex items-center justify-between mb-6">
                <Link
                    to="/admin/all-complaints"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('admin_complaint_detail.back')}
                </Link>
                <Link
                    to={`/admin/print/${id}`}
                    className="btn-secondary flex items-center gap-2"
                >
                    <Printer className="w-4 h-4" />
                    {t('admin_complaint_detail.print')}
                </Link>
            </div>

            {/* Cancelled Banner */}
            {complaint.status === 'cancelled' && (
                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-purple-500 flex-shrink-0" />
                    <div>
                        <p className="font-medium text-purple-700">
                            {t('admin_complaint_detail.cancelled_title') || 'Aduan Telah Dibatalkan'}
                        </p>
                        <p className="text-sm text-purple-600">
                            {t('admin_complaint_detail.cancelled_message', {
                                userName: complaint.users?.full_name || 'Pengguna',
                                date: formatDate(complaint.updated_at)
                            }) || `${complaint.users?.full_name || 'Pengguna'} telah membatalkan aduan ini pada ${formatDate(complaint.updated_at)}`}
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Complaint Details */}
                    <div className="card">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <p className="text-sm text-gray-500">{t('admin_complaint_detail.report_no')}</p>
                                <h2 className="text-2xl font-bold text-gray-800">{complaint.report_number}</h2>
                            </div>
                            {getStatusBadge(complaint.status)}
                        </div>

                        {/* Track Repair Section */}
                        <div className="mt-6 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl flex items-center justify-between">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Wrench className="w-5 h-5 text-teal-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">{t('user_dashboard.track_repair') || 'Track Repair'}</h3>
                                    <p className="text-sm text-gray-500">{t('user_dashboard.track_repair_desc') || 'View repair progress and history.'}</p>
                                </div>
                            </div>
                            <Link
                                to={`/admin/complaint/${id}/track-repair`}
                                className="btn-primary flex items-center gap-2 whitespace-nowrap text-sm px-4 py-2"
                            >
                                <Eye className="w-4 h-4" />
                                {t('user_dashboard.view_track_repair') || 'VIEW TRACK REPAIR'}
                            </Link>
                        </div>

                        {/* Customer Info */}
                        <div className="p-4 bg-gray-50 rounded-lg mb-6">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {t('admin_complaint_detail.customer_info')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500">{t('admin_complaint_detail.name')}</p>
                                    <p className="font-medium">{complaint.users?.full_name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">{t('admin_complaint_detail.ic_no')}</p>
                                    <p className="font-medium">{complaint.users?.ic_number || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">{t('admin_complaint_detail.phone')}</p>
                                    <p className="font-medium">{complaint.users?.contact_no || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">{t('admin_complaint_detail.address')}</p>
                                    <p className="font-medium">{complaint.users?.address || '-'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Complaint Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">{t('admin_complaint_detail.category')}</p>
                                <p className="font-medium">{complaint.categories?.name || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('admin_complaint_detail.subcategory')}</p>
                                <p className="font-medium">{complaint.subcategory}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('admin_complaint_detail.brand')}</p>
                                <p className="font-medium">{complaint.brand_name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('admin_complaint_detail.model_no')}</p>
                                <p className="font-medium">{complaint.model_no || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('admin_complaint_detail.purchase_location')}</p>
                                <p className="font-medium">{complaint.state}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('admin_complaint_detail.warranty_type')}</p>
                                <p className="font-medium">{complaint.complaint_type}</p>
                            </div>
                        </div>

                        {/* Documents */}
                        {(complaint.warranty_file || complaint.receipt_file) && (
                            <div className="mt-6 pt-6 border-t">
                                <p className="text-sm text-gray-500 mb-4">{t('admin_complaint_detail.documents')}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {complaint.warranty_file && (
                                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-blue-700">{t('admin_complaint_detail.warranty_doc')}</p>
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
                                                    <p className="text-sm font-medium text-green-700">{t('admin_complaint_detail.receipt')}</p>
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
                            <p className="text-sm text-gray-500 mb-2">{t('admin_complaint_detail.defect_details')}</p>
                            <p className="text-gray-700 whitespace-pre-wrap">{complaint.details}</p>
                        </div>
                    </div>

                    {/* Add Remark Form - Hide for cancelled complaints */}
                    {complaint.status !== 'cancelled' && (
                        <div className="card">
                            <h3 className="text-lg font-semibold mb-4">{t('admin_complaint_detail.add_remark')}</h3>

                            {(adminRemarks.length + techRemarks.length) >= 3 ? (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                                    <strong className="font-bold">{t('admin_complaint_detail.remark_limit')}</strong>
                                </div>
                            ) : (
                                <form onSubmit={handleAddRemark} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin_complaint_detail.status')}</label>
                                            <select
                                                value={remarkData.status}
                                                onChange={(e) => setRemarkData({ ...remarkData, status: e.target.value })}
                                                className="input-field"
                                            >
                                                <option value="">-- {t('admin_complaint_detail.select_status')} --</option>
                                                <option value="pending">{t('admin_users.status_pending')}</option>
                                                <option value="in_process">{t('admin_users.status_in_process')}</option>
                                                <option value="closed">{t('admin_users.status_closed')}</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin_complaint_detail.transport_note')}</label>
                                            <input
                                                type="text"
                                                value={remarkData.note_transport}
                                                onChange={(e) => setRemarkData({ ...remarkData, note_transport: e.target.value })}
                                                className="input-field"
                                                placeholder="Cth: Hantar ke bengkel"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin_complaint_detail.checking')}</label>
                                        <input
                                            type="text"
                                            value={remarkData.checking}
                                            onChange={(e) => setRemarkData({ ...remarkData, checking: e.target.value })}
                                            className="input-field"
                                            placeholder="Hasil pemeriksaan"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin_complaint_detail.remark')}</label>
                                        <textarea
                                            value={remarkData.remark}
                                            onChange={(e) => setRemarkData({ ...remarkData, remark: e.target.value })}
                                            rows={3}
                                            className="input-field resize-none"
                                            placeholder="Catatan tambahan..."
                                        />
                                    </div>
                                    <button type="submit" disabled={isSaving} className="btn-primary flex items-center gap-2">
                                        {isSaving ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                {t('admin_complaint_detail.save_remark')}
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                            {/* Forward to Technician */}
                            {complaint.status !== 'closed' && (
                                <div className="mt-6 pt-6 border-t">
                                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                                        <Forward className="w-5 h-5" />
                                        {t('admin_complaint_detail.forward_technician')}
                                    </h3>

                                    {complaint.technicians && (
                                        <p className="text-sm text-gray-600 mb-3">
                                            {t('admin_complaint_detail.assigned_to')}: <strong>{complaint.technicians.name}</strong>
                                        </p>
                                    )}

                                    <select
                                        value={forwardTo}
                                        onChange={(e) => setForwardTo(e.target.value)}
                                        className="input-field mb-3"
                                    >
                                        <option value="">-- {t('admin_complaint_detail.select_technician')} --</option>
                                        {technicians.map((tech) => (
                                            <option key={tech.id} value={tech.id}>
                                                {tech.name} ({tech.department})
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        value={forwardStatus}
                                        onChange={(e) => setForwardStatus(e.target.value)}
                                        className="input-field mb-3"
                                    >
                                        <option value="">-- {t('admin_complaint_detail.select_status') || 'Select Status'} --</option>
                                        <option value="pending">{t('admin_users.status_pending')}</option>
                                        <option value="in_process">{t('admin_users.status_in_process')}</option>
                                        <option value="closed">{t('admin_users.status_closed')}</option>
                                    </select>

                                    <button
                                        onClick={handleForward}
                                        disabled={isSaving || !forwardTo}
                                        className="btn-primary w-full flex items-center justify-center gap-2"
                                    >
                                        <Send className="w-4 h-4" />
                                        {t('admin_complaint_detail.btn_forward')}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Timeline */}
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            {t('admin_complaint_detail.timeline')}
                        </h3>

                        {adminRemarks.length === 0 && techRemarks.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">{t('admin_complaint_detail.no_remarks')}</p>
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
                                                        {remark.type === 'admin' ? t('roles.admin') : t('roles.technician')}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{formatDate(remark.created_at)}</span>
                                                </div>
                                                {remark.status && (
                                                    <p className="text-sm mb-1"><strong>{t('admin_complaint_detail.status')}:</strong> {remark.status === 'pending' ? t('admin_users.status_pending') : remark.status === 'in_process' ? t('admin_users.status_in_process') : remark.status === 'incomplete' ? 'Incomplete / Bawa Pulang' : remark.status === 'ready_pickup' ? 'Sedia Diambil / Ready Pickup' : remark.status === 'cancelled' ? 'Dibatalkan' : t('admin_users.status_closed')}</p>
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
                                                        {remark.note_transport && <p className="text-sm text-gray-600 mt-1"><strong>{t('admin_complaint_detail.transport_note')}:</strong> {remark.note_transport}</p>}
                                                        {remark.checking && <p className="text-sm text-gray-600 mt-1"><strong>{t('admin_complaint_detail.checking')}:</strong> {remark.checking}</p>}
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
                        <h3 className="font-semibold mb-4">{t('admin_complaint_detail.dates')}</h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-gray-500">{t('admin_complaint_detail.date_created')}</p>
                                <p className="font-medium">{formatDate(complaint.created_at)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">{t('admin_complaint_detail.date_updated')}</p>
                                <p className="font-medium">{formatDate(complaint.updated_at)}</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </AdminLayout>
    );
}
