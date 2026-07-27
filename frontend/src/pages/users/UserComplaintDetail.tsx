import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, User, Calendar, MapPin, Wrench, XCircle, Eye, Download, X, ZoomIn } from 'lucide-react';
import UserLayout from '../../components/UserLayout';
import api, { getFileUrl } from '../../services/api';
import DocumentPreviewCard, { isPdfFile } from '../../components/DocumentPreviewCard';
import { Complaint } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function UserComplaintDetail() {
    const { t, i18n } = useTranslation();
    const { id } = useParams();
    const [complaint, setComplaint] = useState<Complaint | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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

    useEffect(() => {
        loadComplaint();
    }, [id]);

    const loadComplaint = async () => {
        try {
            const response = await api.get(`/complaints/${id}`);
            setComplaint(response.data.complaint);
        } catch (error) {
            toast.error(t('common.error_load'));
        } finally {
            setIsLoading(false);
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
            <UserLayout title={t('user_dashboard.title_details')} breadcrumb={t('user_dashboard.title_details')}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
                </div>
            </UserLayout>
        );
    }

    if (!complaint) {
        return (
            <UserLayout title={t('user_dashboard.title_details')} breadcrumb={t('user_dashboard.title_details')}>
                <div className="text-center py-12">
                    <p className="text-gray-500">{t('admin_master.no_data')}</p>
                    <Link to="/users/complaint-history" className="text-primary-600 mt-4 inline-block">
                        ← {t('user_dashboard.back_to_history')}
                    </Link>
                </div>
            </UserLayout>
        );
    }

    return (
        <UserLayout title={t('user_dashboard.title_details')} breadcrumb={t('user_dashboard.title_details')}>


            {/* Cancelled Banner */}
            {complaint.status === 'cancelled' && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                    <div>
                        <p className="font-medium text-red-700">
                            {t('user_dashboard.cancelled_title') || 'Aduan Telah Dibatalkan'}
                        </p>
                        <p className="text-sm text-red-600">
                            {t('user_dashboard.cancelled_message', { date: formatDate(complaint.updated_at) }) ||
                                `Anda telah membatalkan aduan ini pada ${formatDate(complaint.updated_at)}`}
                        </p>
                    </div>
                </div>
            )}

            <div className="max-w-4xl mx-auto">
                {/* Main Info */}
                <div className="space-y-6">
                    {/* Complaint Details */}
                    <div className="card">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                            <div>
                                <p className="text-sm text-gray-500">{t('admin_users.report_no')}</p>
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
                                    <p className="text-xs text-teal-700 mt-1.5 font-medium">{t('user_dashboard.label_date_updated')}: {formatDate(complaint.updated_at)}</p>
                                </div>
                            </div>
                            <Link
                                to={`/users/complaint/${id}/track-repair`}
                                className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap text-sm px-4 py-2 w-full sm:w-auto"
                            >
                                <Eye className="w-4 h-4" />
                                {t('user_dashboard.view_track_repair')}
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('admin_master.category')}</p>
                                    <p className="font-medium">{complaint.categories?.name || '-'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Wrench className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('admin_master.subcategory')}</p>
                                    <p className="font-medium">{complaint.subcategory}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-green-600 font-bold text-sm">B</span>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('admin_master.brand')}</p>
                                    <p className="font-medium">{complaint.brand_name}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <MapPin className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('user_dashboard.label_purchase_location')}</p>
                                    <p className="font-medium">{complaint.state}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-yellow-600 font-bold text-sm">#</span>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('user_dashboard.label_model_no')}</p>
                                    <p className="font-medium">{complaint.model_no || '-'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Calendar className="w-5 h-5 text-teal-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('user_dashboard.label_warranty_type')}</p>
                                    <p className="font-medium">{complaint.complaint_type}</p>
                                </div>
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
                                    <DocumentPreviewCard
                                        file={complaint.receipt_file}
                                        reportNumber={complaint.report_number}
                                        title={t('user_dashboard.label_receipt')}
                                        colorTheme="green"
                                        defaultFilenamePrefix="Receipt"
                                        onZoom={(url) => setLightboxUrl(url)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Details */}
                        <div className="mt-6 pt-6 border-t">
                            <p className="text-sm text-gray-500 mb-2">{t('user_dashboard.label_defect_details')}</p>
                            <p className="text-gray-700 whitespace-pre-wrap">{complaint.details}</p>
                        </div>

                        {/* Assigned Technician */}
                        {complaint.technicians && (
                            <div className="mt-6 pt-6 border-t">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                        <User className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">{t('user_dashboard.label_technician')}</p>
                                        <p className="font-medium">{complaint.technicians.name}</p>
                                        <p className="text-xs text-gray-400">{complaint.technicians.department}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
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
                        {isPdfFile(lightboxUrl) ? (
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
        </UserLayout>
    );
}
