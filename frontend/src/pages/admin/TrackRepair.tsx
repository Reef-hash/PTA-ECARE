import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Clock, Wrench, CheckCircle, AlertTriangle, XCircle, PackageOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import AdminLayout from '../../components/AdminLayout';
import UserLayout from '../../components/UserLayout';
import RepairTimeline from '../../components/repair/RepairTimeline';
import api from '../../services/api';
import { Complaint, ComplaintRemark, TechnicianRemark, RepairStatus } from '../../types';
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
            case 'cancelled': return <XCircle className="w-5 h-5 text-red-500" />;
            case 'incomplete': return <PackageOpen className="w-5 h-5 text-amber-500" />;
            case 'ready_pickup': return <CheckCircle className="w-5 h-5 text-indigo-500" />;
            default: return <AlertTriangle className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <span className="badge badge-pending text-sm px-3 py-1">{t('admin_users.status_pending')}</span>;
            case 'in_process': return <span className="badge badge-in-process text-sm px-3 py-1">{t('admin_users.status_in_process')}</span>;
            case 'incomplete': return <span className="badge badge-incomplete text-sm px-3 py-1">{t('admin_users.status_incomplete')}</span>;
            case 'bawa_pulang': return <span className="badge badge-incomplete text-sm px-3 py-1">{t('admin_users.status_bawa_pulang')}</span>;
            case 'ready_pickup': return <span className="badge bg-indigo-100 text-indigo-700 border-indigo-200 text-sm px-3 py-1">Ready Pickup</span>;
            case 'closed': return <span className="badge badge-closed text-sm px-3 py-1">{t('admin_users.status_closed')}</span>;
            case 'cancelled': return <span className="badge bg-red-100 text-red-700 text-sm px-3 py-1">{t('admin_users.status_cancelled') || 'Dibatalkan'}</span>;
            default: return null;
        }
    };

    function mapComplaintStatus(status: string): RepairStatus {
        switch (status) {
            case 'pending': return 'PENDING';
            case 'in_process': return 'IN_PROCESS';
            case 'incomplete': return 'IN_COMPLETE';
            case 'ready_pickup':
            case 'closed': return 'COMPLETE';
            default: return 'PENDING';
        }
    }

    function buildTimelineEvents(remarks: any[]): any[] {
        const statusMap: Record<string, RepairStatus> = {
            pending: 'PENDING',
            in_process: 'IN_PROCESS',
            incomplete: 'IN_COMPLETE',
            ready_pickup: 'COMPLETE',
            closed: 'COMPLETE',
        };

        return remarks.map(remark => {
            const repairStatus = remark.status ? statusMap[remark.status] || 'PENDING' : 'PENDING';
            const locale = i18n.language === 'ms' ? 'ms-MY' : 'en-US';
            const d = new Date(remark.created_at);
            const dateStr = d.toLocaleDateString(locale, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });

            // Map standard labels
            let label = 'Pending';
            if (repairStatus === 'IN_PROCESS') label = 'In Process';
            if (repairStatus === 'IN_COMPLETE') label = 'In Complete / Bawa Pulang';
            if (repairStatus === 'COMPLETE') label = 'Complete (Ready to Pickup)';

            return {
                status: repairStatus,
                label,
                date: dateStr,
                remark: {
                    remarkBy: remark.type === 'tech' 
                        ? remark.technicians?.name || 'Technician' 
                        : (remark.resolved_user?.role === 'main_technician' ? 'Main Technician' : 'Admin'),
                    remark: remark.remark,
                    noteTransport: remark.note_transport,
                    checking: remark.checking,
                }
            };
        });
    }

    if (isLoading) {
        return (
            <Layout title={t('user_dashboard.track_repair')} breadcrumb={t('user_dashboard.track_repair')}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                </div>
            </Layout>
        );
    }

    if (!complaint) {
        return (
            <Layout title={t('user_dashboard.track_repair')} breadcrumb={t('user_dashboard.track_repair')}>
                <div className="text-center py-12">
                    <p className="text-gray-500">{t('admin_complaint_detail.complaint_not_found')}</p>
                </div>
            </Layout>
        );
    }

    const allRemarks = [
        ...adminRemarks.map(r => ({ ...r, type: 'admin' as const })),
        ...techRemarks.map(r => ({ ...r, type: 'tech' as const }))
    ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const currentStatus = mapComplaintStatus(complaint.status);
    const timelineEvents = buildTimelineEvents(allRemarks);
    const isClosed = complaint.status === 'closed';

    return (
        <Layout title={t('user_dashboard.track_repair')} breadcrumb={t('user_dashboard.track_repair')}>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="flex items-center justify-between mb-6">
                    <Link
                        to={backLink}
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('admin_complaint_detail.back')}
                    </Link>
                </div>

                {/* BLOCK 1: Track Repair Progress (TOP) */}
                <RepairTimeline currentStatus={currentStatus} timelineEvents={timelineEvents} isClosed={isClosed} />

                {/* BLOCK 2: Complaint Details (BELOW) */}
                <div className="card mt-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 border-b pb-3 gap-4">
                        <div>
                            <p className="text-xs text-gray-400 font-semibold tracking-wider uppercase">{t('admin_complaint_detail.report_no')}</p>
                            <h2 className="text-xl font-bold text-gray-900">{complaint.report_number}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {getStatusIcon(complaint.status)}
                            {getStatusBadge(complaint.status)}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-xs text-gray-400">{t('complaint_list.customer')}</p>
                            <p className="font-semibold text-gray-700">{complaint.users?.full_name || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">{t('admin_complaint_detail.category')}</p>
                            <p className="font-semibold text-gray-700">{complaint.categories?.name || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">{t('admin_complaint_detail.subcategory')}</p>
                            <p className="font-semibold text-gray-700">{complaint.subcategory}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">{t('admin_complaint_detail.brand')}</p>
                            <p className="font-semibold text-gray-700">{complaint.brand_name}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">{t('admin_complaint_detail.model_no')}</p>
                            <p className="font-semibold text-gray-700">{complaint.model_no || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">{t('admin_complaint_detail.warranty_type')}</p>
                            <p className="font-semibold text-gray-700">{complaint.complaint_type}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">{t('common.technician')}</p>
                            <p className="font-semibold text-gray-700">{complaint.technicians?.name || t('admin_complaint_detail.not_assigned')}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">{t('admin_complaint_detail.date_created')}</p>
                            <p className="font-semibold text-gray-700">{formatDate(complaint.created_at)}</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </Layout>
    );
}
