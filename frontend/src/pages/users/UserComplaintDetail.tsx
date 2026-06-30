import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, User, Calendar, MapPin, Wrench, XCircle, Eye, Download } from 'lucide-react';
import UserLayout from '../../components/UserLayout';
import api from '../../services/api';
import { Complaint } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function UserComplaintDetail() {
    const { t, i18n } = useTranslation();
    const { id } = useParams();
    const [complaint, setComplaint] = useState<Complaint | null>(null);

    const [isLoading, setIsLoading] = useState(true);

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
                return <span className="badge bg-orange-100 text-orange-700 border-orange-200">Incomplete</span>;
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
            {/* Back Button */}
            <Link
                to="/users/complaint-history"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                {t('user_dashboard.back_to_history')}
            </Link>

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

                        {/* Track Repair Section */}
                        <div className="mt-6 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl flex items-center justify-between">
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
                                to={`/users/complaint/${id}/track-repair`}
                                className="btn-primary flex items-center gap-2 whitespace-nowrap text-sm px-4 py-2"
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

                        {/* Documents */}
                        {(complaint.warranty_file || complaint.receipt_file) && (
                            <div className="mt-6 pt-6 border-t">
                                <p className="text-sm text-gray-500 mb-4">{t('user_dashboard.label_documents')}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {complaint.warranty_file && (
                                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <FileText className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-blue-700">{t('user_dashboard.label_warranty_doc')}</p>
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
                                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                    <FileText className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-green-700">{t('user_dashboard.label_receipt')}</p>
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

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Dates */}
                    <div className="card">
                        <h3 className="font-semibold mb-4">{t('common_actions.date')}</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-500">{t('user_dashboard.label_date_created')}</p>
                                <p className="font-medium">{formatDate(complaint.created_at)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('user_dashboard.label_date_updated')}</p>
                                <p className="font-medium">{formatDate(complaint.updated_at)}</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </UserLayout>
    );
}
