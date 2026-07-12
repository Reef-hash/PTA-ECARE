import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, CheckCircle, AlertCircle, Plus, XCircle, X, PackageOpen } from 'lucide-react';
import UserLayout from '../../components/UserLayout';
import api from '../../services/api';
import { Complaint } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { parseNotificationMessage } from '../../utils/notificationParser';
import Modal from '../../components/Modal';

export default function UserDashboard() {
    const { t, i18n } = useTranslation();
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        in_process: 0,
        closed: 0,
        cancelled: 0,
        incomplete: 0,
    });
    const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<number | null>(null);

    const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; id: number | null; reportNumber: string }>({
        isOpen: false,
        id: null,
        reportNumber: '',
    });

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            // Load recent complaints
            const recentResponse = await api.get('/complaints?limit=5');
            const complaints = recentResponse.data.complaints || [];

            // Sort by updated_at descending (most recently updated first)
            const sortedComplaints = complaints.sort((a: Complaint, b: Complaint) => {
                const dateA = new Date(a.updated_at || a.created_at).getTime();
                const dateB = new Date(b.updated_at || b.created_at).getTime();
                return dateB - dateA;
            });

            setRecentComplaints(sortedComplaints);

            // Load stats for each status by requesting count only
            const [totalRes, pendingRes, inProcessRes, closedRes, cancelledRes, incompleteRes] = await Promise.all([
                api.get('/complaints?limit=1'),
                api.get('/complaints?status=pending&limit=1'),
                api.get('/complaints?status=in_process&limit=1'),
                api.get('/complaints?status=closed&limit=1'),
                api.get('/complaints?status=cancelled&limit=1'),
                api.get('/complaints?status=incomplete&limit=1'),
            ]);

            setStats({
                total: totalRes.data.pagination?.total || 0,
                pending: pendingRes.data.pagination?.total || 0,
                in_process: inProcessRes.data.pagination?.total || 0,
                closed: closedRes.data.pagination?.total || 0,
                cancelled: cancelledRes.data.pagination?.total || 0,
                incomplete: incompleteRes.data.pagination?.total || 0,
            });
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
            year: 'numeric'
        });
        const timePart = date.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        return `${datePart} ${connector} ${timePart}`;
    };

    // Helper for payload generation (Universal Parser logic)
    const getStatusPayload = (complaint: Complaint) => {
        const { status, technicians, updated_at, created_at, report_number } = complaint;
        const dateToUse = status === 'pending' && !technicians ? created_at : updated_at;

        const dateObj = new Date(dateToUse);
        const locale = i18n.language === 'en' ? 'en-MY' : 'ms-MY';
        const dateStr = dateObj.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const techName = technicians?.name || technicians?.username || 'Technician';


        if (status === 'pending') {
            // User specific context
            if (technicians) {
                // Forwarded to technician -> User sees "Assigned to X" ??
                // Or standard "In Process" logic? Not really.
                // Existing logic used: t('admin_users.status_assigned_detailed', { name: techName, date: dateTime })
                return null; // Fallback to existing manual translation for specific UI needs not covered by Notification Keys
            }
            // Created
            return JSON.stringify({
                key: 'user_complaint_created_msg',
                params: { report_number }
            });
        }

        if (status === 'in_process') {
            return JSON.stringify({
                key: 'notif_processing_body',
                params: {
                    id: report_number,
                    name: techName,
                    date: dateStr,
                    time: timeStr
                }
            });
        }

        if (status === 'closed') {
            return JSON.stringify({
                key: 'notif_completed_body',
                params: {
                    id: report_number,
                    name: techName,
                    date: dateStr,
                    time: timeStr
                }
            });
        }

        return null;
    }

    const renderStatusDescription = (complaint: Complaint) => {
        const payload = getStatusPayload(complaint);
        if (payload) {
            return (
                <div className="text-xs text-gray-500">
                    <p>{parseNotificationMessage(payload, t)}</p>
                    {complaint.status === 'closed' && (
                        <p className="text-green-600 font-medium mt-1">{t('status_msg.ready_pickup')}</p>
                    )}
                </div>
            );
        }

        const { status, technicians, updated_at, created_at } = complaint;
        const dateToUse = status === 'pending' && !technicians ? created_at : updated_at;
        const dateTime = formatDateTime(dateToUse);
        const techName = technicians?.name || technicians?.username || 'Technician';

        if (status === 'cancelled') {
            return (
                <div className="text-xs text-gray-500">
                    <p>{t('admin_users.status_cancelled_detailed', { date: dateTime })}</p>
                </div>
            );
        }
        if (status === 'pending') {
            if (technicians) {
                return (
                    <div className="text-xs text-gray-500">
                        <p>{t('admin_users.status_assigned_detailed', { name: techName, date: dateTime })}</p>
                    </div>
                );
            }
            // Should have been covered by payload but fallback here
            return (
                <div className="text-xs text-gray-500">
                    <p>{t('admin_users.status_pending_detailed')}</p>
                </div>
            );
        }
        if (status === 'incomplete' || status === 'bawa_pulang') {
            return (
                <div className="text-xs text-gray-500">
                    <p>{t('admin_users.status_incomplete')}</p>
                </div>
            );
        }
        return null;
    };

    const confirmCancel = async () => {
        if (!cancelModal.id) return;

        setCancellingId(cancelModal.id);
        try {
            await api.delete(`/complaints/${cancelModal.reportNumber}/cancel`);
            toast.success(t('complaint_history.cancelled_success') || 'Aduan berjaya dibatalkan');
            loadDashboard();
        } catch (error: any) {
            toast.error(error.response?.data?.error || t('common.error'));
        } finally {
            setCancellingId(null);
            setCancelModal({ isOpen: false, id: null, reportNumber: '' });
        }
    };

    // Open modal instead of window.confirm
    const handleCancelClick = (id: number, reportNumber: string) => {
        setCancelModal({ isOpen: true, id, reportNumber });
    };

    if (isLoading) {
        return (
            <UserLayout title={t('user_dashboard.title')} breadcrumb={t('user_dashboard.title')}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
                </div>
            </UserLayout>
        );
    }

    const statCards = [
        { label: t('dashboard.total_complaints'), value: stats.total, icon: FileText, color: 'purple', path: '/users/complaint-history' },
        { label: t('dashboard.pending'), value: stats.pending, icon: Clock, color: 'orange', path: '/users/complaint-history?status=pending' },
        { label: t('dashboard.in_process'), value: stats.in_process, icon: AlertCircle, color: 'green', path: '/users/complaint-history?status=in_process' },
        { label: t('dashboard.closed'), value: stats.closed, icon: CheckCircle, color: 'gray', path: '/users/complaint-history?status=closed' },
        { label: t('dashboard.cancelled'), value: stats.cancelled || 0, icon: XCircle, color: 'red', path: '/users/complaint-history?status=cancelled' },
        { label: t('dashboard.incomplete'), value: stats.incomplete || 0, icon: PackageOpen, color: 'yellow', path: '/users/complaint-history?status=incomplete' },
    ];

    const getColorClasses = (color: string) => {
        const colors: Record<string, { bg: string; icon: string; border: string }> = {
            blue: { bg: 'bg-blue-100', icon: 'text-blue-600', border: 'border-l-blue-500' },
            yellow: { bg: 'bg-yellow-100', icon: 'text-yellow-600', border: 'border-l-yellow-500' },
            orange: { bg: 'bg-orange-100', icon: 'text-orange-600', border: 'border-l-orange-500' },
            red: { bg: 'bg-red-100', icon: 'text-red-600', border: 'border-l-red-500' },
            green: { bg: 'bg-green-100', icon: 'text-green-600', border: 'border-l-green-500' },
            purple: { bg: 'bg-purple-100', icon: 'text-purple-600', border: 'border-l-purple-500' },
            gray: { bg: 'bg-gray-100', icon: 'text-gray-600', border: 'border-l-gray-500' },
        };
        return colors[color] || colors.blue;
    };

    return (
        <UserLayout title={t('user_dashboard.title')} breadcrumb={t('user_dashboard.title')}>
            {/* Quick Action */}
            <div className="mb-6">
                <Link
                    to="/users/register-complaint"
                    className="inline-flex items-center gap-2 btn-primary"
                >
                    <Plus className="w-5 h-5" />
                    {t('user_dashboard.new_complaint')}
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-8">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    const colors = getColorClasses(card.color);
                    return (
                        <Link
                            key={card.label}
                            to={card.path}
                            className={`bg-white rounded-xl shadow-sm border-l-4 p-3 sm:p-5 ${colors.border} hover:shadow-lg transition-shadow flex flex-col justify-between`}
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

            {/* Recent Complaints */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-800">{t('user_dashboard.recent_complaints')}</h2>
                    <Link
                        to="/users/complaint-history"
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                        {t('common.view_all')} →
                    </Link>
                </div>

                {recentComplaints.length === 0 ? (
                    <div className="text-center py-12">
                        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">{t('complaint_list.no_complaints')}</p>
                        <Link
                            to="/users/register-complaint"
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block"
                        >
                            {t('user_dashboard.make_first_complaint')} →
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-hidden sm:rounded-lg">
                        {/* Mobile Layout (List-Item Compact) */}
                        <div className="block md:hidden border-t border-gray-200">
                            {recentComplaints.map((complaint, index) => (
                                <div key={complaint.id} className="bg-white border-b border-gray-200 p-4 last:border-b-0 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400 font-medium text-xs">#{index + 1}</span>
                                                <Link
                                                    to={`/users/complaint/${complaint.report_number}`}
                                                    className="text-primary-600 hover:text-primary-700 font-bold text-sm"
                                                >
                                                    {complaint.report_number}
                                                </Link>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            {getStatusBadge(complaint.status)}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 text-sm mt-2 items-center">
                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('admin_complaint_detail.date_created')}</span>
                                        <span className="text-gray-900 font-medium text-xs col-span-2">
                                            {complaint.created_at
                                                ? new Date(complaint.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : '-'}
                                        </span>

                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('complaint_form.category')}</span>
                                        <span className="text-gray-900 font-medium text-xs col-span-2">{complaint.categories?.name || '-'}</span>
                                        
                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('admin_master.subcategory')}</span>
                                        <span className="text-gray-900 font-medium text-xs col-span-2">{complaint.subcategory}</span>

                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('complaint_form.defect_details') || 'Kerosakan'}</span>
                                        <span className="text-gray-900 font-medium text-xs col-span-2">{complaint.details || '-'}</span>
                                        
                                        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('admin_complaint_detail.assigned_to') || 'Technician'}</span>
                                        <span className="text-gray-900 font-medium text-xs col-span-2">{complaint.technicians?.name || t('admin_complaint_detail.not_assigned')}</span>
                                    </div>
                                    
                                    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-3">
                                        <div className="text-xs text-gray-500 leading-relaxed">
                                            {renderStatusDescription(complaint)}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {complaint.status === 'pending' && (
                                                <button
                                                    onClick={() => handleCancelClick(complaint.id, complaint.report_number)}
                                                    disabled={cancellingId === complaint.id}
                                                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 w-full"
                                                >
                                                    {cancellingId === complaint.id ? (
                                                        <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <X className="w-3.5 h-3.5" />
                                                    )}
                                                    {t('common_actions.cancel') || 'Cancel'}
                                                </button>
                                            )}
                                            <Link
                                                to={`/users/complaint/${complaint.report_number}/track-repair`}
                                                className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors w-full shadow-sm"
                                            >{t('user_dashboard.view_track_repair', 'TRACK REPAIR')}</Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Layout (Table) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="table-header">
                                        <th className="text-center px-4 py-3 w-12 whitespace-nowrap">#</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('complaint_list.report_no')}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('complaint_form.category')}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('complaint_form.brand')}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('common_actions.status')}</th>
                                        <th className="text-center px-4 py-3 whitespace-nowrap">{t('common_actions.action')}</th>
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
                                                        to={`/users/complaint/${complaint.report_number}`}
                                                        className="text-primary-600 hover:text-primary-700 font-medium"
                                                    >
                                                        {complaint.report_number}
                                                    </Link>
                                                    <Link
                                                        to={`/users/complaint/${complaint.report_number}/track-repair`}
                                                        className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-0.5 rounded transition-colors w-fit"
                                                    >{t('user_dashboard.view_track_repair', 'TRACK REPAIR')}</Link>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{complaint.subcategory}</td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{complaint.brand_name}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    {getStatusBadge(complaint.status)}
                                                    <div className="mt-1">
                                                        {renderStatusDescription(complaint)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                {complaint.status === 'pending' ? (
                                                    <button
                                                        onClick={() => handleCancelClick(complaint.id, complaint.report_number)}
                                                        disabled={cancellingId === complaint.id}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        {cancellingId === complaint.id ? (
                                                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <X className="w-4 h-4" />
                                                        )}
                                                        {t('common_actions.cancel') || 'Cancel'}
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <Modal
                isOpen={cancelModal.isOpen}
                onClose={() => setCancelModal({ ...cancelModal, isOpen: false })}
                title={t('common_actions.cancel') || 'Cancel Complaint'}
                description={t('complaint_history.confirm_cancel', { report_number: cancelModal.reportNumber }) || `Adakah anda pasti mahu membatalkan aduan ${cancelModal.reportNumber}? Tindakan ini tidak boleh dikembalikan.`}
                confirmLabel="Yes"
                cancelLabel="No"
                onConfirm={confirmCancel}
                variant="danger"
                isLoading={cancellingId === cancelModal.id}
            />
        </UserLayout >
    );
}
