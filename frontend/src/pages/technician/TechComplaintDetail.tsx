import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, User, Wrench, Save, Printer, Eye, Download, ZoomIn, X } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api, { getFileUrl } from '../../services/api';
import { Complaint, ComplaintRemark, TechnicianRemark } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

export default function TechComplaintDetail() {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const { id } = useParams();
    const [complaint, setComplaint] = useState<Complaint | null>(null);
    const [adminRemarks, setAdminRemarks] = useState<ComplaintRemark[]>([]);
    const [techRemarks, setTechRemarks] = useState<TechnicianRemark[]>([]);
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
        // No required field validations as requested

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
            await loadComplaint();
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
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                            <div>
                                <p className="text-sm text-gray-500">Report No</p>
                                <h2 className="text-2xl font-bold text-gray-800">{complaint.report_number}</h2>
                                <p className="text-sm text-gray-500 mt-1">{t('user_dashboard.label_date_created')}: {formatDate(complaint.created_at)}</p>
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
                                to={`/admin/technician/complaint/${id}/track-repair`}
                                className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap text-sm px-4 py-2 w-full sm:w-auto"
                            >
                                <Eye className="w-4 h-4" />{t('user_dashboard.view_track_repair', 'TRACK REPAIR PROGRESS')}</Link>
                        </div>

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

                        {/* Documents - Preview Boxes */}
                        {(complaint.warranty_file || complaint.receipt_file) && (
                            <div className="mt-6 pt-6 border-t">
                                <p className="text-sm text-gray-500 mb-4 font-medium uppercase tracking-wider">{t('user_dashboard.label_documents')}</p>
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
                                                        <p className="font-semibold text-blue-800 text-sm">{t('user_dashboard.label_warranty_doc')}</p>
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
                                                        <p className="font-semibold text-green-800 text-sm">{t('user_dashboard.label_receipt')}</p>
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
                            <p className="text-sm text-gray-500 mb-2">{t('user_dashboard.label_defect_details')}</p>
                            <p className="text-gray-700 whitespace-pre-wrap">{complaint.details}</p>
                        </div>
                    </div>

                    {/* Add Remark & Remark List (satu card) */}
                    <div className="card">
                        {/* Remark List - at top */}
                        {techRemarks.filter((r: any) => r.remark_by === user?.id).length > 0 && (
                            <>
                                <h3 className="text-lg font-semibold mb-4">Senarai Catatan</h3>
                                <div className="space-y-3">
                                    {techRemarks
                                        .filter((r: any) => r.remark_by === user?.id)
                                        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                                        .map((remark: any) => (
                                            <div key={remark.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-medium text-gray-800">
                                                            {remark.technicians?.name || t('common.technician')}
                                                        </span>
                                                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{t('common.technician')}</span>
                                                    </div>
                                                    <span className="text-xs text-gray-400">{formatDate(remark.created_at)}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 mb-2">
                                                    {remark.status && getStatusBadge(remark.status)}
                                                </div>
                                                {remark.note_transport && (
                                                    <p className="text-sm text-gray-600"><span className="font-medium">{t('technician_dashboard.label_transport_note')}:</span> {remark.note_transport}</p>
                                                )}
                                                {remark.checking && (
                                                    <p className="text-sm text-gray-600"><span className="font-medium">{t('technician_dashboard.label_checking')}:</span> {remark.checking}</p>
                                                )}
                                                {remark.remark && (
                                                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                                                        <span className="font-medium">{t('technician_dashboard.label_remark')}:</span> {remark.remark}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                </div>
                                <div className="border-t border-gray-200 my-6" />
                            </>
                        )}

                        {/* Add Remark Form - at bottom */}
                        {(() => {
                            const isEscalated = (complaint.tracks && complaint.tracks.some(track => track.status === 'incomplete' || track.status === 'bawa_pulang')) || complaint.status === 'incomplete' || complaint.status === 'bawa_pulang' || remarkData.status === 'incomplete' || remarkData.status === 'bawa_pulang';
                            const myTechRemarks = techRemarks.filter((r: any) => r.remark_by === user?.id).length;
                            const totalRemarks = myTechRemarks;
                            const maxRemarks = isEscalated ? 6 : 3;
                            const remaining = maxRemarks - totalRemarks;
                            const isQuotaFull = remaining <= 0 && !editingId;
                            const absoluteMax = 6;
                            const isAssignedToMe = complaint.assigned_to === user?.id;
                            if ((complaint.status === 'incomplete' || complaint.status === 'bawa_pulang') && !editingId && !isAssignedToMe) {
                                return (
                                    <>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-4 border-b border-gray-100 gap-2">
                                            <h3 className="text-lg font-semibold">{t('technician_dashboard.add_remark_title')}</h3>
                                            <div className="text-left sm:text-right">
                                                <p className="text-xs text-gray-500">{t('user_dashboard.label_date_updated')}</p>
                                                <p className="text-sm font-medium text-gray-800">{formatDate(complaint.updated_at)}</p>
                                            </div>
                                        </div>
                                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded relative mb-4" role="alert">
                                            <strong className="font-bold">Perhatian: </strong>
                                            <span className="block sm:inline">Aduan ini telah dikemaskini sebagai 'Incomplete / Bawa Pulang' dan telah diserahkan kembali kepada Main Technician. Anda tidak lagi boleh menambah komen atau menukar status.</span>
                                        </div>
                                    </>
                                );
                            }

                            const currentLimitReached = totalRemarks >= maxRemarks && !editingId;

                            return (<>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-4 border-b border-gray-100 gap-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold">{t('technician_dashboard.add_remark_title')}</h3>
                                    {isQuotaFull ? (
                                        <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-red-50 text-red-600 border-red-200">
                                            {t('admin_complaint_detail.remark_limit', { limit: maxRemarks })}
                                        </span>
                                    ) : (
                                        <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-blue-50 text-blue-600 border-blue-200">
                                            {t('admin_complaint_detail.remark_counter_badge', { remaining, max: maxRemarks })}
                                        </span>
                                    )}
                                </div>
                                <div className="text-left sm:text-right">
                                    <p className="text-xs text-gray-500">{t('user_dashboard.label_date_updated')}</p>
                                    <p className="text-sm font-medium text-gray-800">{formatDate(complaint.updated_at)}</p>
                                </div>
                            </div>

                            <form onSubmit={handleAddRemark} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('common_actions.status')}</label>
                                        <select
                                            value={remarkData.status}
                                            onChange={(e) => setRemarkData({ ...remarkData, status: e.target.value })}
                                            className="input-field"
                                        >
                                            <option value="">-- {t('common.select_status')} --</option>
                                            <option value="pending">{t('admin_users.status_pending')}</option>
                                            <option value="in_process">{t('admin_users.status_in_process')}</option>
                                            <option value="incomplete">{t('admin_users.status_incomplete')}</option>
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
                                    <button type="submit" disabled={isSaving || currentLimitReached || isQuotaFull} className="btn-success flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                        {isSaving ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                {editingId ? t('technician_dashboard.btn_update_remark') : (isQuotaFull ? t('admin_complaint_detail.remark_quota_full_btn') : t('technician_dashboard.btn_save_remark'))}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                            </>);
                        })()}
                    </div>

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
        </AdminLayout>
    );
}
