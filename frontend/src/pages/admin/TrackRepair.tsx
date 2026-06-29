import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Clock, Wrench, CheckCircle, AlertTriangle, XCircle, PackageOpen } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import UserLayout from '../../components/UserLayout';
import api from '../../services/api';
import { Complaint, ComplaintRemark, TechnicianRemark } from '../../types';
import { useTranslation } from 'react-i18next';

export default function TrackRepair() {
    const { t, i18n } = useTranslation();
    const { id } = useParams();
    const location = useLocation();
    const [complaint, setComplaint] = useState<Complaint | null>(null);
    const [adminRemarks, setAdminRemarks] = useState<ComplaintRemark[]>([]);
    const [techRemarks, setTechRemarks] = useState<TechnicianRemark[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const isUser = location.pathname.startsWith('/users');
    const Layout = isUser ? UserLayout : AdminLayout;
    const backLink = isUser ? `/users/complaint/${id}` : location.pathname.includes('/admin/technician') ? `/admin/technician/complaint/${id}` : `/admin/complaint/${id}`;

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
            console.error('Failed to load complaint');
        } finally {
            setIsLoading(false);
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

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
            case 'in_process': return <Wrench className="w-5 h-5 text-orange-500" />;
            case 'closed': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'cancelled': return <XCircle className="w-5 h-5 text-purple-500" />;
            case 'incomplete': return <PackageOpen className="w-5 h-5 text-amber-500" />;
            case 'ready_pickup': return <CheckCircle className="w-5 h-5 text-indigo-500" />;
            default: return <AlertTriangle className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <span className="badge badge-pending text-sm px-3 py-1">{t('admin_users.status_pending')}</span>;
            case 'in_process': return <span className="badge badge-in-process text-sm px-3 py-1">{t('admin_users.status_in_process')}</span>;
            case 'incomplete': return <span className="badge bg-orange-100 text-orange-700 border-orange-200 text-sm px-3 py-1">Incomplete / Bawa Pulang</span>;
            case 'ready_pickup': return <span className="badge bg-indigo-100 text-indigo-700 border-indigo-200 text-sm px-3 py-1">Ready Pickup</span>;
            case 'closed': return <span className="badge badge-closed text-sm px-3 py-1">{t('admin_users.status_closed')}</span>;
            case 'cancelled': return <span className="badge bg-purple-100 text-purple-700 text-sm px-3 py-1">{t('admin_users.status_cancelled') || 'Dibatalkan'}</span>;
            default: return null;
        }
    };

    if (isLoading) {
        return (
            <Layout title="Track Repair" breadcrumb="Track Repair">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                </div>
            </Layout>
        );
    }

    if (!complaint) {
        return (
            <Layout title="Track Repair" breadcrumb="Track Repair">
                <div className="text-center py-12">
                    <p className="text-gray-500">Complaint not found</p>
                </div>
            </Layout>
        );
    }

    const allRemarks = [
        ...adminRemarks.map(r => ({ ...r, type: 'admin' as const })),
        ...techRemarks.map(r => ({ ...r, type: 'tech' as const }))
    ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return (
        <Layout title="Track Repair" breadcrumb="Track Repair">
            <div className="flex items-center justify-between mb-6">
                <Link
                    to={backLink}
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Link>
            </div>

            {/* Complaint Header */}
            <div className="card mb-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-sm text-gray-500">Report No.</p>
                        <h2 className="text-2xl font-bold text-gray-800">{complaint.report_number}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        {getStatusIcon(complaint.status)}
                        {getStatusBadge(complaint.status)}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <p className="text-xs text-gray-500">Customer</p>
                        <p className="font-medium text-sm">{complaint.users?.full_name || '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Category</p>
                        <p className="font-medium text-sm">{complaint.categories?.name || '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Subcategory</p>
                        <p className="font-medium text-sm">{complaint.subcategory}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Brand</p>
                        <p className="font-medium text-sm">{complaint.brand_name}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Model No.</p>
                        <p className="font-medium text-sm">{complaint.model_no || '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Warranty</p>
                        <p className="font-medium text-sm">{complaint.complaint_type}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Technician</p>
                        <p className="font-medium text-sm">{complaint.technicians?.name || 'Not assigned'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Created</p>
                        <p className="font-medium text-sm">{formatDate(complaint.created_at)}</p>
                    </div>
                </div>

                {complaint.details && (
                    <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-gray-500 mb-1">Defect Details</p>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{complaint.details}</p>
                    </div>
                )}
            </div>

            {/* Track Repair Timeline */}
            <div className="card">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Track Repair
                </h3>

                {allRemarks.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No repair records yet</p>
                ) : (
                    <div className="space-y-4">
                        {allRemarks.map((remark) => (
                            <div key={`${remark.type}-${remark.id}`} className="relative pl-6 pb-4 border-l-2 border-gray-200 last:border-0">
                                <div className={`absolute -left-2 w-4 h-4 rounded-full ${remark.type === 'admin' ? 'bg-indigo-500' : 'bg-green-500'}`}></div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-xs font-medium px-2 py-1 rounded ${remark.type === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                                            {remark.type === 'admin' ? 'Admin' : 'Technician'}
                                        </span>
                                        <span className="text-xs text-gray-500">{formatDate(remark.created_at)}</span>
                                    </div>
                                    {remark.status && (
                                        <p className="text-sm mb-1"><strong>Status:</strong> {
                                            remark.status === 'pending' ? 'Pending' :
                                            remark.status === 'in_process' ? 'In Process' :
                                            remark.status === 'incomplete' ? 'Incomplete / Bawa Pulang' :
                                            remark.status === 'ready_pickup' ? 'Ready Pickup' :
                                            remark.status === 'cancelled' ? 'Cancelled' : 'Closed'
                                        }</p>
                                    )}
                                    {remark.remark && <p className="text-gray-700 text-sm">{remark.remark}</p>}
                                    {remark.note_transport && <p className="text-sm text-gray-600 mt-1"><strong>Transport Note:</strong> {remark.note_transport}</p>}
                                    {remark.checking && <p className="text-sm text-gray-600 mt-1"><strong>Checking:</strong> {remark.checking}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
