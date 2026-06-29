import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import { Complaint } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function TechDashboard() {
    const { t, i18n } = useTranslation();
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        in_process: 0,
        closed: 0,
    });
    const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            // Fetch stats from dedicated endpoint (counts all assigned complaints)
            const statsResponse = await api.get('/complaints/my-stats');
            if (statsResponse.data.stats) {
                setStats(statsResponse.data.stats);
            }

            // Fetch recent complaints for the table
            const complaintsResponse = await api.get('/complaints?limit=5');
            const complaints = complaintsResponse.data.complaints || [];

            // Sort by updated_at descending (most recently updated first)
            const sortedComplaints = complaints.sort((a: Complaint, b: Complaint) => {
                const dateA = new Date(a.updated_at || a.created_at).getTime();
                const dateB = new Date(b.updated_at || b.created_at).getTime();
                return dateB - dateA;
            });

            setRecentComplaints(sortedComplaints);
        } catch (error) {
            toast.error(t('common.error_load'));
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="badge badge-pending">{t('table.pending')}</span>;
            case 'in_process':
                return <span className="badge badge-in-process">{t('table.in_process')}</span>;
            case 'incomplete':
                return <span className="badge bg-orange-100 text-orange-700 border-orange-200">Incomplete</span>;
            case 'ready_pickup':
                return <span className="badge bg-indigo-100 text-indigo-700 border-indigo-200">Ready Pickup</span>;
            case 'closed':
                return <span className="badge badge-closed">{t('table.closed')}</span>;
            case 'cancelled':
                return <span className="badge bg-red-100 text-red-700">{t('admin_users.status_cancelled') || 'Dibatalkan'}</span>;
            default:
                return null;
        }
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        const locale = i18n.language === 'en' ? 'en-MY' : 'ms-MY';
        const connector = i18n.language === 'en' ? 'at' : 'pada';

        const datePart = date.toLocaleDateString(locale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        const timePart = date.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
        return `${datePart} ${connector} ${timePart}`;
    };

    const getStatusMessage = (complaint: Complaint) => {
        const dateTime = formatDateTime(complaint.updated_at);
        const createdDateTime = formatDateTime(complaint.created_at);
        const customerName = complaint.users?.full_name || t('common.customer') || 'Pelanggan';
        const technicianName = complaint.technicians?.name || t('common.technician') || 'Juruteknik';
        const isAssigned = complaint.assigned_to !== null;

        switch (complaint.status) {
            case 'cancelled':
                return (
                    <div className="text-xs text-gray-500">
                        <p>{t('status_msg.cancelled_by') || 'Aduan telah dibatalkan oleh'} <span className="font-medium text-gray-700">{customerName}</span></p>
                        <p>{t('status_msg.on') || 'pada'} {dateTime}</p>
                    </div>
                );
            case 'pending':
                // Check if complaint is assigned (forwarded)
                if (isAssigned) {
                    return (
                        <div className="text-xs text-gray-500">
                            <p>{t('status_msg.forwarded_to') || 'Aduan telah diagihkan kepada'}</p>
                            <p><span className="font-medium text-gray-700">{technicianName}</span></p>
                            <p>{t('status_msg.on') || 'pada'} {dateTime}</p>
                        </div>
                    );
                }
                return (
                    <div className="text-xs text-gray-500">
                        <p>{t('status_msg.created_on') || 'Aduan telah dibuat pada'}</p>
                        <p>{createdDateTime}</p>
                    </div>
                );
            case 'in_process':
                return (
                    <div className="text-xs text-gray-500">
                        <p>{t('status_msg.processing_by') || 'Aduan sedang diproses oleh'}</p>
                        <p><span className="font-medium text-gray-700">{technicianName}</span></p>
                        <p>{t('status_msg.on') || 'pada'} {dateTime}</p>
                    </div>
                );
            case 'incomplete':
                return <span className="badge bg-orange-100 text-orange-700 border-orange-200">Incomplete</span>;
            case 'ready_pickup':
                return <span className="badge bg-indigo-100 text-indigo-700 border-indigo-200">Ready Pickup</span>;
            case 'closed':
                return (
                    <div className="text-xs text-gray-500">
                        <p>{t('status_msg.completed_by') || 'Aduan telah selesai dibaiki oleh'}</p>
                        <p><span className="font-medium text-gray-700">{technicianName}</span></p>
                        <p>{t('status_msg.on') || 'pada'} {dateTime}</p>
                        <p className="text-green-600 font-medium mt-1">{t('status_msg.ready_pickup') || 'Barang sedia untuk diambil'}</p>
                    </div>
                );
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <AdminLayout title={t('tech_dashboard.title')} breadcrumb={t('tech_dashboard.title')}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
                </div>
            </AdminLayout>
        );
    }

    const statCards = [
        { label: t('dashboard.pending'), value: stats.pending, icon: Clock, color: 'yellow', path: '/admin/technician/complaints?status=pending' },
        { label: t('dashboard.in_process'), value: stats.in_process, icon: AlertTriangle, color: 'orange', path: '/admin/technician/complaints?status=in_process' },
        { label: t('dashboard.closed'), value: stats.closed, icon: CheckCircle, color: 'green', path: '/admin/technician/complaints?status=closed' },
    ];

    const getColorClasses = (color: string) => {
        const colors: Record<string, { bg: string; icon: string; border: string }> = {
            blue: { bg: 'bg-blue-100', icon: 'text-blue-600', border: 'border-l-blue-500' },
            yellow: { bg: 'bg-yellow-100', icon: 'text-yellow-600', border: 'border-l-yellow-500' },
            orange: { bg: 'bg-orange-100', icon: 'text-orange-600', border: 'border-l-orange-500' },
            green: { bg: 'bg-green-100', icon: 'text-green-600', border: 'border-l-green-500' },
        };
        return colors[color] || colors.blue;
    };

    return (
        <AdminLayout title={t('tech_dashboard.title')} breadcrumb={t('tech_dashboard.title')}>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    const colors = getColorClasses(card.color);
                    return (
                        <Link
                            key={card.label}
                            to={card.path}
                            className={`stat-card ${colors.border} hover:shadow-lg transition-shadow cursor-pointer`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm">{card.label}</p>
                                    <p className="text-3xl font-bold text-gray-800 mt-1">{card.value}</p>
                                </div>
                                <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center`}>
                                    <Icon className={`w-6 h-6 ${colors.icon}`} />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Recent Assigned Complaints */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-800">{t('tech_dashboard.recent_assigned')}</h2>
                    <Link
                        to="/admin/technician/complaints"
                        className="text-green-600 hover:text-green-700 text-sm font-medium"
                    >
                        {t('common.view_all')} →
                    </Link>
                </div>

                {recentComplaints.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">{t('tech_dashboard.no_complaints')}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="table-header">
                                    <th className="text-center px-4 py-3 w-12 whitespace-nowrap">No.</th>
                                    <th className="text-left px-4 py-3 whitespace-nowrap">{t('complaint_list.report_no')}</th>
                                    <th className="text-left px-4 py-3 whitespace-nowrap">{t('complaint_list.customer')}</th>
                                    <th className="text-left px-4 py-3 whitespace-nowrap">{t('complaint_form.subcategory')}</th>
                                    <th className="text-left px-4 py-3 whitespace-nowrap">{t('complaint_form.brand')}</th>
                                    <th className="text-left px-4 py-3 whitespace-nowrap">{t('table.status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentComplaints.map((complaint, index) => (
                                    <tr key={complaint.id} className="table-row">
                                        <td className="px-4 py-3 text-center text-gray-500 font-medium whitespace-nowrap">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <Link
                                                    to={`/admin/technician/complaint/${complaint.id}`}
                                                    className="text-green-600 hover:text-green-700 font-medium"
                                                >
                                                    {complaint.report_number}
                                                </Link>
                                                <Link
                                                    to={`/admin/technician/complaint/${complaint.id}/track-repair`}
                                                    className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-0.5 rounded transition-colors w-fit"
                                                >
                                                    TRACK REPAIR
                                                </Link>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div>
                                                <p className="font-medium text-gray-800">{complaint.users?.full_name || '-'}</p>
                                                <p className="text-xs text-gray-500">
                                                    ID/IC: {complaint.users?.ic_number || (t('common.no_ic_info') || 'Tiada Maklumat IC')}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{complaint.subcategory}</td>
                                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{complaint.brand_name}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div>
                                                {getStatusBadge(complaint.status)}
                                                <div className="mt-2">
                                                    {getStatusMessage(complaint)}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
