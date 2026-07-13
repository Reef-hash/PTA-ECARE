import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Wrench, Calendar } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import UserLayout from '../../components/UserLayout';
import RepairTimeline from '../../components/repair/RepairTimeline';
import api from '../../services/api';
import { Complaint, ComplaintRemark, TechnicianRemark, RepairStatus } from '../../types';
import { useTranslation } from 'react-i18next';

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

function buildTimelineEvents(remarks: any[], i18n: any): any[] {
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

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
    PENDING: { label: 'Pending', class: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    IN_PROCESS: { label: 'In Process', class: 'bg-blue-100 text-blue-700 border-blue-200' },
    IN_COMPLETE: { label: 'In Complete / Bawa Pulang', class: 'bg-orange-100 text-orange-700 border-orange-200' },
    COMPLETE: { label: 'Complete (Ready to Pickup)', class: 'bg-green-100 text-green-700 border-green-200' },
};

export default function RepairDetail() {
    const { i18n } = useTranslation();
    const { id } = useParams();
    const location = useLocation();
    const [complaint, setComplaint] = useState<Complaint | null>(null);
    const [adminRemarks, setAdminRemarks] = useState<ComplaintRemark[]>([]);
    const [techRemarks, setTechRemarks] = useState<TechnicianRemark[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const isUser = location.pathname.startsWith('/users');
    const Layout = isUser ? UserLayout : AdminLayout;
    const backLink = isUser
        ? `/users/complaint/${id}`
        : location.pathname.includes('/admin/technician')
            ? `/admin/technician/complaint/${id}`
            : `/admin/complaint/${id}`;

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

    if (isLoading) {
        return (
            <Layout title="Repair Detail" breadcrumb="Repair Detail">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
                </div>
            </Layout>
        );
    }

    if (!complaint) {
        return (
            <Layout title="Repair Detail" breadcrumb="Repair Detail">
                <div className="text-center py-12">
                    <p className="text-gray-500">Repair record not found</p>
                </div>
            </Layout>
        );
    }

    const currentStatus = mapComplaintStatus(complaint.status);
    const statusInfo = STATUS_BADGE[currentStatus] || STATUS_BADGE.PENDING;

    const allRemarks = [
        ...adminRemarks.map(r => ({ ...r, type: 'admin' as const })),
        ...techRemarks.map(r => ({ ...r, type: 'tech' as const }))
    ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const timelineEvents = buildTimelineEvents(allRemarks, i18n);
    const isClosed = complaint.status === 'closed';
    return (
        <Layout title="Repair Detail" breadcrumb="Repair Detail">
            {/* Back Button */}
            <Link
                to={backLink}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Back
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Repair Header */}
                    <div className="card">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                            <div>
                                <p className="text-sm text-gray-500">Report No.</p>
                                <h2 className="text-2xl font-bold text-gray-800">{complaint.report_number}</h2>
                            </div>
                            <div className="self-start sm:self-auto w-fit">
                                <span className={`badge ${statusInfo.class}`}>{statusInfo.label}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Customer
                                </h3>
                                <p className="font-medium text-gray-800">{complaint.users?.full_name || '-'}</p>
                                <p className="text-xs text-gray-500 mt-1">ID/IC: {complaint.users?.ic_number || '-'}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <Wrench className="w-4 h-4" />
                                    Device
                                </h3>
                                <p className="font-medium text-gray-800">{complaint.brand_name} {complaint.model_no ? `(${complaint.model_no})` : ''}</p>
                                <p className="text-xs text-gray-500 mt-1">{complaint.categories?.name} - {complaint.subcategory}</p>
                            </div>
                        </div>
                    </div>

                    {/* Tracking Progress */}
                    <RepairTimeline timelineEvents={timelineEvents} isClosed={isClosed} />

                    {/* Defect Details */}
                    {complaint.details && (
                        <div className="card">
                            <h3 className="font-semibold mb-3">Defect Details</h3>
                            <p className="text-gray-700 text-sm whitespace-pre-wrap">{complaint.details}</p>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="card">
                        <h3 className="font-semibold mb-4">Repair Information</h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-gray-500">Category</p>
                                <p className="font-medium">{complaint.categories?.name || '-'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Subcategory</p>
                                <p className="font-medium">{complaint.subcategory}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Warranty</p>
                                <p className="font-medium">{complaint.complaint_type}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Technician</p>
                                <p className="font-medium">{complaint.technicians?.name || 'Not assigned'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="card">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Dates
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-gray-500">Created</p>
                                <p className="font-medium">{formatDate(complaint.created_at)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Last Updated</p>
                                <p className="font-medium text-gray-800">{formatDate(complaint.updated_at)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
