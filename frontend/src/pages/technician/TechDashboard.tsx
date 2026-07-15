import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, AlertTriangle, PackageOpen, Package, Eye, Printer } from 'lucide-react';
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
        incomplete_in: 0,
        incomplete_out: 0,
    });
    const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
    const [historyComplaints, setHistoryComplaints] = useState<Complaint[]>([]);
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDashboard();

        // Auto-refresh data every 15 seconds
        const interval = setInterval(() => {
            loadDashboard();
        }, 15000);

        return () => clearInterval(interval);
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

            // Fetch history complaints
            const historyResponse = await api.get('/complaints?limit=10&view=history');
            const hComplaints = historyResponse.data.complaints || [];
            
            // Filter out complaints that are currently assigned to the user
            // to only show jobs they handled in the past but don't own now,
            // or just show all their history. The backend history query returns both.
            // For clarity in history tab, we can just show all of them sorted.
            const sortedHistory = hComplaints.sort((a: Complaint, b: Complaint) => {
                const dateA = new Date(a.updated_at || a.created_at).getTime();
                const dateB = new Date(b.updated_at || b.created_at).getTime();
                return dateB - dateA;
            });
            setHistoryComplaints(sortedHistory);
        } catch (error) {
            toast.error(t('common.error_load'));
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="badge badge-pending">{t('admin_users.status_pending')}</span>;
            case 'in_process':
                return <span className="badge badge-in-process">{t('admin_users.status_in_process')}</span>;
            case 'incomplete':
                return <span className="badge badge-incomplete">{t('admin_users.status_incomplete') || 'Incomplete / Bawa Pulang'}</span>;
            case 'bawa_pulang':
                return <span className="badge badge-incomplete">{t('admin_users.status_bawa_pulang')}</span>;
            case 'ready_pickup':
                return <span className="badge bg-indigo-100 text-indigo-700 border-indigo-200">Ready Pickup</span>;
            case 'closed':
                return <span className="badge badge-closed">{t('admin_users.status_closed')}</span>;
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
        { label: t('dashboard.incomplete_in'), value: stats.incomplete_in, icon: PackageOpen, color: 'red', path: '/admin/technician/complaints?status=incomplete_in' },
        { label: t('dashboard.incomplete_out'), value: stats.incomplete_out, icon: Package, color: 'amber', path: '/admin/technician/complaints?view=history&status=incomplete_out' },
        { label: t('dashboard.completed'), value: stats.closed, icon: CheckCircle, color: 'green', path: '/admin/technician/complaints?status=closed' },
    ];

    const getColorClasses = (color: string) => {
        const colors: Record<string, { bg: string; icon: string; border: string }> = {
            blue: { bg: 'bg-blue-100', icon: 'text-blue-600', border: 'border-l-blue-500' },
            yellow: { bg: 'bg-yellow-100', icon: 'text-yellow-600', border: 'border-l-yellow-500' },
            orange: { bg: 'bg-orange-100', icon: 'text-orange-600', border: 'border-l-orange-500' },
            green: { bg: 'bg-green-100', icon: 'text-green-600', border: 'border-l-green-500' },
            amber: { bg: 'bg-amber-100', icon: 'text-amber-600', border: 'border-l-amber-500' },
            red: { bg: 'bg-red-100', icon: 'text-red-600', border: 'border-l-red-500' },
        };
        return colors[color] || colors.blue;
    };

    return (
        <AdminLayout title={t('tech_dashboard.title')} breadcrumb={t('tech_dashboard.title')}>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-4 mb-8">
                {statCards.map((card, index) => {
                    const Icon = card.icon;
                    const colors = getColorClasses(card.color);
                    // Center the 5th card on mobile without stretching it
                    const isLastCard = index === statCards.length - 1;
                    const layoutClass = isLastCard 
                        ? 'col-span-2 justify-self-center w-[calc(50%-0.25rem)] sm:w-[calc(50%-0.5rem)] lg:col-span-1 lg:justify-self-auto lg:w-full' 
                        : 'w-full';
                        
                    return (
                        <Link
                            key={card.label}
                            to={card.path}
                            className={`bg-white rounded-xl shadow-sm border-l-4 p-3 sm:p-5 ${colors.border} hover:shadow-lg transition-shadow cursor-pointer flex flex-col justify-between ${layoutClass}`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-gray-500 text-[10px] sm:text-xs uppercase font-medium leading-tight line-clamp-2 pr-1">{card.label}</p>
                                <div className={`w-8 h-8 sm:w-10 sm:h-10 ${colors.bg} rounded-md sm:rounded-lg flex items-center justify-center shrink-0`}>
                                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${colors.icon}`} />
                                </div>
                            </div>
                            <p className="text-xl sm:text-2xl font-bold text-gray-800">{card.value}</p>
                        </Link>
                    );
                })}
            </div>

            {/* Recent Assigned Complaints */}
            <div className="card">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold text-gray-800">{t('tech_dashboard.recent_assigned')}</h2>
                    <Link
                        to="/admin/technician/complaints"
                        className="text-green-600 hover:text-green-700 text-sm font-medium"
                    >
                        {t('common.view_all')} →
                    </Link>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-4">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'active' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Tugasan Aktif
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'history' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Sejarah Tugasan
                    </button>
                </div>

                {(activeTab === 'active' ? recentComplaints : historyComplaints).length === 0 ? (
                    <p className="text-gray-500 text-center py-8">{t('tech_dashboard.no_complaints')}</p>
                ) : (
                    <div className="overflow-hidden sm:rounded-lg">
                        {/* Mobile Layout (List-Item Compact) */}
                        <div className="block md:hidden border-t border-gray-200">
                            {(activeTab === 'active' ? recentComplaints : historyComplaints).map((complaint, index) => (
                                <div key={complaint.id} className="bg-white border-b border-gray-200 p-4 last:border-b-0 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400 font-medium text-xs">#{index + 1}</span>
                                                <Link
                                                    to={`/admin/technician/complaint/${complaint.report_number}`}
                                                    className="font-bold text-green-600 hover:text-green-700 text-sm"
                                                >
                                                    {complaint.report_number}
                                                </Link>
                                            </div>
                                            <div>
                                                {getStatusBadge(complaint.status)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link
                                                to={`/admin/technician/complaint/${complaint.report_number}`}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title={t('technician_dashboard.click_to_view') || 'View'}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            <Link
                                                to={`/admin/print/${complaint.report_number}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Cetak Resit"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm items-start mb-3 mt-3">
                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider mt-0.5">{t('complaint_list.customer')}</span>
                                        <div>
                                            <p className="font-medium text-gray-800 text-xs">{complaint.users?.full_name || '-'}</p>
                                            <p className="text-[10px] text-gray-500">IC: {complaint.users?.ic_number || (t('common.no_ic_info') || 'Tiada Maklumat IC')}</p>
                                        </div>

                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider mt-0.5">{t('complaint_form.subcategory')}</span>
                                        <span className="text-gray-600 text-xs">{complaint.subcategory}</span>

                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider mt-0.5">{t('complaint_form.brand')}</span>
                                        <span className="text-gray-600 text-xs">{complaint.brand_name}</span>

                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider mt-0.5">{t('common.date_created') || 'Tarikh Dicipta'}</span>
                                        <span className="text-gray-600 text-xs">{new Date(complaint.created_at).toLocaleDateString(i18n.language === 'en' ? 'en-MY' : 'ms-MY')}</span>

                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider mt-0.5">{t('complaint_form.defect_details') || 'Kerosakan'}</span>
                                        <span className="text-gray-600 text-xs line-clamp-2" title={complaint.details}>{complaint.details || '-'}</span>
                                    </div>

                                    <div className="mt-4">
                                        <Link
                                            to={`/admin/technician/complaint/${complaint.report_number}`}
                                            className="block w-full text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2.5 rounded-lg transition-colors text-center shadow-sm uppercase tracking-wider"
                                        >{activeTab === 'history' ? t('user_dashboard.view_track_repair', 'TRACK REPAIR PROGRESS') : t('technician_dashboard.update_track_repair', 'UPDATE TRACK REPAIR PROGRESS')}</Link>
                                    </div>

                                    {getStatusMessage(complaint) && (
                                        <div className="bg-gray-50 p-2.5 rounded-md text-xs border border-gray-100 mt-3">
                                            {getStatusMessage(complaint)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Desktop Layout (Table) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="table-header">
                                        <th className="text-center px-4 py-3 w-12 whitespace-nowrap">No.</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('complaint_list.report_no')}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('complaint_list.customer')}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('complaint_form.subcategory')}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('complaint_form.brand')}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('common_actions.status')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {(activeTab === 'active' ? recentComplaints : historyComplaints).map((complaint, index) => (
                                        <tr key={complaint.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-center text-gray-500 font-medium whitespace-nowrap">
                                                {index + 1}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <Link
                                                        to={`/admin/technician/complaint/${complaint.report_number}`}
                                                        className="text-green-600 hover:text-green-700 font-medium"
                                                    >
                                                        {complaint.report_number}
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
                                                <div className="text-xs">
                                                    {getStatusBadge(complaint.status)}
                                                    <div className="mt-2 mb-2">
                                                        {getStatusMessage(complaint)}
                                                    </div>
                                                    <Link
                                                        to={`/admin/technician/complaint/${complaint.report_number}`}
                                                        className="inline-block text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded transition-colors w-fit uppercase tracking-wider"
                                                    >{activeTab === 'history' ? t('user_dashboard.view_track_repair', 'TRACK REPAIR PROGRESS') : t('technician_dashboard.update_track_repair', 'UPDATE TRACK REPAIR PROGRESS')}</Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
