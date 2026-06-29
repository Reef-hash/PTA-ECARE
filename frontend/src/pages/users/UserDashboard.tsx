import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, CheckCircle, AlertCircle, Plus, XCircle, X } from 'lucide-react';
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
            const [totalRes, pendingRes, inProcessRes, closedRes, cancelledRes] = await Promise.all([
                api.get('/complaints?limit=1'),
                api.get('/complaints?status=pending&limit=1'),
                api.get('/complaints?status=in_process&limit=1'),
                api.get('/complaints?status=closed&limit=1'),
                api.get('/complaints?status=cancelled&limit=1'),
            ]);

            setStats({
                total: totalRes.data.pagination?.total || 0,
                pending: pendingRes.data.pagination?.total || 0,
                in_process: inProcessRes.data.pagination?.total || 0,
                closed: closedRes.data.pagination?.total || 0,
                cancelled: cancelledRes.data.pagination?.total || 0,
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
        return null;
    };

    const confirmCancel = async () => {
        if (!cancelModal.id) return;

        setCancellingId(cancelModal.id);
        try {
            await api.delete(`/complaints/${cancelModal.id}/cancel`);
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <Link to="/users/complaint-history" className="stat-card border-l-blue-500 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">{t('dashboard.total_complaints')}</p>
                            <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </Link>

                <Link to="/users/complaint-history?status=pending" className="stat-card border-l-orange-500 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">{t('dashboard.pending')}</p>
                            <p className="text-3xl font-bold text-gray-800">{stats.pending}</p>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </Link>

                <Link to="/users/complaint-history?status=in_process" className="stat-card border-l-yellow-500 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">{t('dashboard.in_process')}</p>
                            <p className="text-3xl font-bold text-gray-800">{stats.in_process}</p>
                        </div>
                        <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <Clock className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>
                </Link>

                <Link to="/users/complaint-history?status=closed" className="stat-card border-l-green-500 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">{t('dashboard.closed')}</p>
                            <p className="text-3xl font-bold text-gray-800">{stats.closed}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </Link>

                <Link to="/users/complaint-history?status=cancelled" className="stat-card border-l-red-500 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">{t('dashboard.cancelled') || 'Dibatalkan'}</p>
                            <p className="text-3xl font-bold text-gray-800">{stats.cancelled}</p>
                        </div>
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                            <XCircle className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                </Link>
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
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="table-header">
                                    <th className="text-center px-4 py-3 w-12 whitespace-nowrap">#</th>
                                    <th className="text-left px-4 py-3 whitespace-nowrap">{t('complaint_list.report_no')}</th>
                                    <th className="text-left px-4 py-3 whitespace-nowrap">{t('complaint_form.category')}</th>
                                    <th className="text-left px-4 py-3 whitespace-nowrap">{t('complaint_form.brand')}</th>
                                    <th className="text-left px-4 py-3 whitespace-nowrap">{t('table.status')}</th>
                                    <th className="text-center px-4 py-3 whitespace-nowrap">{t('table.action')}</th>
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
                                                    to={`/users/complaint/${complaint.id}`}
                                                    className="text-primary-600 hover:text-primary-700 font-medium"
                                                >
                                                    {complaint.report_number}
                                                </Link>
                                                <Link
                                                    to={`/users/complaint/${complaint.id}/track-repair`}
                                                    className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-0.5 rounded transition-colors w-fit"
                                                >
                                                    TRACK REPAIR
                                                </Link>
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
