import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    FileText, User,
    Forward, Send, Save, Printer, XCircle,
    Download, Eye, Wrench, ZoomIn, X, ShieldAlert, Info,
    Edit2
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import MainTechLayout from '../../components/MainTechLayout';
import api, { getFileUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Complaint, ComplaintRemark, TechnicianRemark, Technician } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function AdminComplaintDetail() {
    const { t, i18n } = useTranslation();
    const { user, role } = useAuth();
    const isMainTech = role === 'main_technician';
    const Layout = isMainTech ? MainTechLayout : AdminLayout;
    const { id } = useParams();
    const [complaint, setComplaint] = useState<Complaint | null>(null);
    const [adminRemarks, setAdminRemarks] = useState<ComplaintRemark[]>([]);
    const [techRemarks, setTechRemarks] = useState<TechnicianRemark[]>([]);
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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
            if (editingId) {
                await api.put(`/complaints/remarks/${editingId}`, remarkData);
                toast.success('Catatan berjaya dikemaskini');
            } else {
                await api.post(`/complaints/${id}/remark`, remarkData);
                toast.success('Catatan berjaya ditambah');
            }
            setRemarkData({ status: '', note_transport: '', checking: '', remark: '' });
            setEditingId(null);
            await loadComplaint();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal menyimpan catatan');
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
            await api.post(`/complaints/${id}/forward`, {
                technician_id: forwardTo,
                status: forwardStatus || (isMainTech ? 'incomplete' : undefined),
                note_transport: remarkData.note_transport || undefined,
                checking: remarkData.checking || undefined,
                remark: remarkData.remark || undefined,
            });
            toast.success('Aduan berjaya diagihkan');
            setForwardTo('');
            setForwardStatus('');
            setRemarkData({ status: '', note_transport: '', checking: '', remark: '' });
            await loadComplaint();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal mengagihkan aduan');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditRemark = (remark: any) => {
        setEditingId(remark.id);
        setRemarkData({
            status: remark.status || '',
            note_transport: remark.note_transport || '',
            checking: remark.checking || '',
            remark: (remark.remark || '').replace(/__FORWARD__.*$/, '').trim(),
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setRemarkData({ status: '', note_transport: '', checking: '', remark: '' });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="badge badge-pending text-base px-4 py-1">{t('admin_users.status_pending')}</span>;
            case 'in_process':
                return <span className="badge badge-in-process text-base px-4 py-1">{t('admin_users.status_in_process')}</span>;
            case 'incomplete':
                return <span className="badge badge-incomplete text-base px-4 py-1">{t('admin_users.status_incomplete')}</span>;
            case 'bawa_pulang':
                return <span className="badge badge-incomplete text-base px-4 py-1">{t('admin_users.status_bawa_pulang')}</span>;
            case 'ready_pickup':
                return <span className="badge bg-indigo-100 text-indigo-700 border-indigo-200">Ready Pickup</span>;
            case 'closed':
                return <span className="badge badge-closed text-base px-4 py-1">{t('admin_users.status_closed')}</span>;
            case 'cancelled':
                return <span className="badge bg-red-100 text-red-700 text-base px-4 py-1">{t('admin_users.status_cancelled') || 'Dibatalkan'}</span>;
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
    const handleDownload = (url: string, filename: string) => {
        toast.loading('Memuat turun...', { id: 'download' });
        const baseApi = import.meta.env.VITE_API_URL || '/api';
        const apiUrl = baseApi === 'https://api.ptas.my' ? 'https://api.ptas.my/api' : baseApi;
        
        const downloadUrl = `${apiUrl}/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => toast.success('Berjaya memuat turun fail!', { id: 'download' }), 1000);
    };

    if (isLoading) {
        return (
            <Layout breadcrumb={t('admin_complaint_detail.title')}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                </div>
            </Layout>
        );
    }

    if (!complaint) {
        return (
            <Layout breadcrumb={t('admin_complaint_detail.title')}>
                <div className="text-center py-12">
                    <p className="text-gray-500">{t('admin_complaint_detail.complaint_not_found')}</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout breadcrumb={t('admin_complaint_detail.title')}>
            {/* Action Buttons */}
            <div className="flex items-center justify-end mb-6">
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
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                            <div>
                                <p className="text-sm text-gray-500">{t('admin_complaint_detail.report_no')}</p>
                                <h2 className="text-2xl font-bold text-gray-800">{complaint.report_number}</h2>
                                <p className="text-sm text-gray-500 mt-1">Date Created: {formatDate(complaint.created_at)}</p>
                            </div>
                            <div className="self-start sm:self-auto w-fit">
                                {getStatusBadge(complaint.status)}
                            </div>
                        </div>

                        {/* Track Repair Section */}
                        <div className="mt-6 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Wrench className="w-5 h-5 text-teal-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">{t('user_dashboard.track_repair')}</h3>
                                    <p className="text-sm text-gray-500">{t('user_dashboard.track_repair_desc')}</p>
                                </div>
                            </div>
                            <Link
                                to={isMainTech ? `/main-tech/complaint/${id}/track-repair` : `/admin/complaint/${id}/track-repair`}
                                className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap text-sm px-4 py-2 w-full sm:w-auto"
                            >
                                <Eye className="w-4 h-4" />
                                {t('user_dashboard.view_track_repair')}
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

                        {/* Documents - Preview Boxes */}
                        {(complaint.warranty_file || complaint.receipt_file) && (
                            <div className="mt-6 pt-6 border-t">
                                <p className="text-sm text-gray-500 mb-4 font-medium uppercase tracking-wider">{t('admin_complaint_detail.documents')}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Warranty Document Preview */}
                                    {complaint.warranty_file && (
                                        <div className="group rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50 to-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                                            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                        <FileText className="w-4 h-4 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-blue-800 text-sm">{t('admin_complaint_detail.warranty_doc')}</p>
                                                        <p className="text-[10px] text-blue-400 uppercase tracking-wider">Document</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => setLightboxUrl(getFileUrl(complaint.warranty_file)!)}
                                                        className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-all"
                                                        title="Zoom"
                                                    >
                                                        <ZoomIn className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownload(getFileUrl(complaint.warranty_file)!, `Warranty-${complaint.report_number}.png`)}
                                                        className="p-1.5 text-blue-500 hover:text-green-600 hover:bg-blue-100 rounded-lg transition-all"
                                                        title="Download"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Preview Area */}
                                            <div
                                                className="relative cursor-pointer"
                                                onClick={() => setLightboxUrl(getFileUrl(complaint.warranty_file)!)}
                                            >
                                                {complaint.warranty_file.toLowerCase().endsWith('.pdf') ? (
                                                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-blue-400">
                                                        <FileText className="w-12 h-12" />
                                                        <span className="text-xs font-medium">PDF Document</span>
                                                    </div>
                                                ) : (
                                                    <div className="relative overflow-hidden">
                                                        <img
                                                            src={getFileUrl(complaint.warranty_file)}
                                                            alt="Warranty Document"
                                                            className="w-full h-48 object-contain bg-white p-2 group-hover:scale-105 transition-transform duration-500"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="flex flex-col items-center justify-center py-10 gap-2 text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg><span class="text-xs font-medium">Document</span></div>';
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all duration-300">
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                                <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                                                                    <ZoomIn className="w-5 h-5 text-blue-600" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Purchase Receipt Preview */}
                                    {complaint.receipt_file && (
                                        <div className="group rounded-xl border border-green-200 bg-gradient-to-b from-green-50 to-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                                            <div className="px-4 py-3 bg-green-50 border-b border-green-100 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                                        <FileText className="w-4 h-4 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-green-800 text-sm">{t('admin_complaint_detail.receipt')}</p>
                                                        <p className="text-[10px] text-green-400 uppercase tracking-wider">Document</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => setLightboxUrl(getFileUrl(complaint.receipt_file)!)}
                                                        className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-100 rounded-lg transition-all"
                                                        title="Zoom"
                                                    >
                                                        <ZoomIn className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownload(getFileUrl(complaint.receipt_file)!, `Receipt-${complaint.report_number}.png`)}
                                                        className="p-1.5 text-green-500 hover:text-green-600 hover:bg-green-100 rounded-lg transition-all"
                                                        title="Download"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Preview Area */}
                                            <div
                                                className="relative cursor-pointer"
                                                onClick={() => setLightboxUrl(getFileUrl(complaint.receipt_file)!)}
                                            >
                                                {complaint.receipt_file.toLowerCase().endsWith('.pdf') ? (
                                                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-green-400">
                                                        <FileText className="w-12 h-12" />
                                                        <span className="text-xs font-medium">PDF Document</span>
                                                    </div>
                                                ) : (
                                                    <div className="relative overflow-hidden">
                                                        <img
                                                            src={getFileUrl(complaint.receipt_file)}
                                                            alt="Purchase Receipt"
                                                            className="w-full h-48 object-contain bg-white p-2 group-hover:scale-105 transition-transform duration-500"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="flex flex-col items-center justify-center py-10 gap-2 text-green-400"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg><span class="text-xs font-medium">Document</span></div>';
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all duration-300">
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                                <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                                                                    <ZoomIn className="w-5 h-5 text-green-600" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
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

                    {/* Remark List - Show history of all remarks with Edit for own remarks */}
                    {(adminRemarks.length > 0 || techRemarks.length > 0) && (
                        <div className="card">
                            <h3 className="text-lg font-semibold mb-4">Senarai Catatan</h3>
                            <div className="space-y-3">
                                {[...adminRemarks.map((r: any) => ({ ...r, _source: 'admin' })), ...techRemarks.map((r: any) => ({ ...r, _source: 'tech' }))]
                                    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                                    .map((remark: any) => {
                                        const isOwn = remark.remark_by === user?.id;
                                        return (
                                            <div key={`${remark._source}-${remark.id}`} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-medium text-gray-800">
                                                            {remark._source === 'admin'
                                                                ? (remark.resolved_user?.name || 'Admin')
                                                                : (remark.technicians?.name || 'Teknisi')}
                                                        </span>
                                                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                                            {remark._source === 'admin' ? 'Admin' : 'Teknisi'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-400">{formatDate(remark.created_at)}</span>
                                                        {isOwn && (
                                                            <button
                                                                onClick={() => handleEditRemark(remark)}
                                                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                                                                title="Edit catatan"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 mb-2">
                                                    {remark.status && getStatusBadge(remark.status)}
                                                </div>
                                                {remark.note_transport && (
                                                    <p className="text-sm text-gray-600"><span className="font-medium">{t('admin_complaint_detail.transport_note')}:</span> {remark.note_transport}</p>
                                                )}
                                                {remark.checking && (
                                                    <p className="text-sm text-gray-600"><span className="font-medium">{t('admin_complaint_detail.checking')}:</span> {remark.checking}</p>
                                                )}
                                                {remark.remark && (
                                                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                                                        {remark.remark.replace(/__FORWARD__.*$/, '').trim() || remark.remark}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* Add Remark Form - Hide for cancelled complaints */}
                    {complaint.status !== 'cancelled' && (
                        <div className="card">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
                                <h3 className="text-lg font-semibold">{t('admin_complaint_detail.add_remark')}</h3>
                                <div className="text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
                                    Last Updated: <span className="font-medium">{formatDate(complaint.updated_at)}</span>
                                </div>
                            </div>

                            {/* Main Tech restriction: read-only after job forwarded */}
                            {isMainTech && complaint.assigned_to ? (
                                <div className="space-y-4">
                                    {/* Info Banner - Job sudah di-forward */}
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <ShieldAlert className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-amber-800 mb-1">Tugasan Sudah Diagihkan</h4>
                                                <p className="text-sm text-amber-700">
                                                    Job ini telah di-forward kepada juruteknik. Anda tidak boleh membuat sebarang perubahan lagi.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Technician Info */}
                                    {complaint.technicians && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <Info className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-blue-500 font-medium uppercase tracking-wider">Juruteknik Ditugaskan</p>
                                                    <p className="font-semibold text-blue-800">{complaint.technicians.name}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                            {(() => {
                                const isEscalated = (complaint.tracks && complaint.tracks.some(track => track.status === 'incomplete' || track.status === 'bawa_pulang')) || complaint.status === 'incomplete' || complaint.status === 'bawa_pulang';
                                const maxRemarks = isEscalated ? 6 : 3;
                                const limitReached = (adminRemarks.length + techRemarks.length) >= maxRemarks;

                                if (limitReached) {
                                    return (
                                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                                            <strong className="font-bold">{t('admin_complaint_detail.remark_limit', { limit: maxRemarks })}</strong>
                                        </div>
                                    );
                                }
                                return (
                                    <form onSubmit={handleAddRemark} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin_complaint_detail.status')}</label>
                                                <select
                                                    value={remarkData.status}
                                                    onChange={(e) => setRemarkData({ ...remarkData, status: e.target.value })}
                                                    className="input-field"
                                                >
                                                    <option value="">-- {t('common.select_status')} --</option>
                                                    {!isMainTech && <option value="pending">{t('admin_users.status_pending')}</option>}
                                                    <option value="in_process">{t('admin_users.status_in_process')}</option>
                                                    <option value="incomplete">{t('technician_dashboard.status_incomplete', 'Incomplete / Bawa Pulang')}</option>
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
                                        <div className="flex items-center gap-2">
                                            {editingId && (
                                                <button type="button" onClick={handleCancelEdit} className="btn-secondary flex items-center gap-2">
                                                    <X className="w-4 h-4" />
                                                    Batal
                                                </button>
                                            )}
                                            <button type="submit" disabled={isSaving} className="btn-primary flex items-center gap-2">
                                                {isSaving ? (
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4" />
                                                        {editingId ? 'Kemaskini Catatan' : t('admin_complaint_detail.save_remark')}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                );
                            })()}

                            {/* Forward to Technician - Hidden for Main Tech when already forwarded */}
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
                                        <option value="">-- {t('common.select_status')} --</option>
                                        {!isMainTech && <option value="pending">{t('admin_users.status_pending')}</option>}
                                        <option value="in_process">{t('admin_users.status_in_process')}</option>
                                        <option value="incomplete">{t('technician_dashboard.status_incomplete', 'Incomplete / Bawa Pulang')}</option>
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
                                </>
                            )}
                        </div>
                    )}



                </div>

                {/* Sidebar */}
                <div className="space-y-6">


                </div>
            </div>

            {/* Lightbox Modal */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setLightboxUrl(null)}
                >
                    <button
                        onClick={() => setLightboxUrl(null)}
                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors z-10"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                    <div
                        className="max-w-4xl max-h-[90vh] overflow-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {lightboxUrl.toLowerCase().endsWith('.pdf') ? (
                            <iframe
                                src={lightboxUrl}
                                className="w-[90vw] max-w-4xl h-[85vh] rounded-lg bg-white"
                                title="Document Preview"
                            />
                        ) : (
                            <img
                                src={lightboxUrl}
                                alt="Document Preview"
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                            />
                        )}
                    </div>
                </div>
            )}
        </Layout>
    );
}
