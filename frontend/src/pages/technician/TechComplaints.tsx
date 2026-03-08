import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import { Complaint } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { parseNotificationMessage } from '../../utils/notificationParser';

export default function TechComplaints() {
    const { t, i18n } = useTranslation();
    const [searchParams] = useSearchParams();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 15,
        total: 0,
        totalPages: 0,
    });

    useEffect(() => {
        const urlStatus = searchParams.get('status');
        if (urlStatus) {
            setStatusFilter(urlStatus);
        }
    }, [searchParams]);

    useEffect(() => {
        loadComplaints();
    }, [pagination.page, statusFilter]);

    const loadComplaints = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
            });

            if (statusFilter !== 'all') {
                params.append('status', statusFilter);
            }
            if (search) {
                params.append('search', search);
            }

            const response = await api.get(`/complaints?${params.toString()}`);

            // Sort by updated_at descending (most recently updated first)
            const sortedComplaints = response.data.complaints.sort((a: Complaint, b: Complaint) => {
                const dateA = new Date(a.updated_at || a.created_at).getTime();
                const dateB = new Date(b.updated_at || b.created_at).getTime();
                return dateB - dateA;
            });

            setComplaints(sortedComplaints);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination.total,
                totalPages: response.data.pagination.totalPages,
            }));
        } catch (error) {
            toast.error(t('common.error_load'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        loadComplaints();
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="badge badge-pending">{t('admin_users.status_pending')}</span>;
            case 'in_process':
                return <span className="badge badge-in-process">{t('admin_users.status_in_process')}</span>;
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

    // Helper for payload generation (Universal Parser logic)
    const getStatusPayload = (complaint: Complaint) => {
        const { status, technicians, updated_at, created_at, report_number } = complaint;
        const dateToUse = status === 'pending' && !technicians ? created_at : updated_at;

        const dateObj = new Date(dateToUse);
        const locale = i18n.language === 'en' ? 'en-MY' : 'ms-MY';
        const dateStr = dateObj.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const techName = technicians?.name || technicians?.username || t('common.technician') || 'Juruteknik';

        if (status === 'pending') {
            if (technicians) return null; // Fallback to manual for "Assigned to"
            return JSON.stringify({
                key: 'new_complaint_msg',
                params: { user_name: complaint.users?.full_name || 'User' }
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

    const getStatusMessage = (complaint: Complaint) => {
        const payload = getStatusPayload(complaint);
        if (payload) {
            return (
                <div className="text-xs text-gray-500">
                    <p>{parseNotificationMessage(payload, t)}</p>
                    {complaint.status === 'closed' && (
                        <p className="text-green-600 font-medium mt-1">{t('status_msg.ready_pickup') || 'Barang sedia untuk diambil'}</p>
                    )}
                </div>
            );
        }

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
            default:
                return null;
        }
    };

    return (
        <AdminLayout title={t('technician_dashboard.title_complaints')} breadcrumb={t('technician_dashboard.title_complaints')}>
            <div className="card">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <form onSubmit={handleSearch} className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('technician_dashboard.search_placeholder')}
                                className="input-field pl-10"
                            />
                        </div>
                    </form>

                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="input-field w-auto"
                        >
                            <option value="all">{t('admin_users.all_status') || 'All Status'}</option> {/* Fallback if key missing */}
                            <option value="pending">{t('admin_users.status_pending')}</option>
                            <option value="in_process">{t('admin_users.status_in_process')}</option>
                            <option value="closed">{t('admin_users.status_closed')}</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
                    </div>
                ) : complaints.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">{t('admin_master.no_data')}</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="table-header">
                                        <th className="text-center px-4 py-3 w-12 whitespace-nowrap">No.</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('admin_users.report_no') || 'Report No'}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('admin_users.customer') || 'Customer'}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('admin_master.subcategory')}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('admin_master.brand')}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('common_actions.status')}</th>
                                        <th className="text-center px-4 py-3 whitespace-nowrap">{t('common_actions.action')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {complaints.map((complaint, index) => (
                                        <tr key={complaint.id} className="table-row">
                                            <td className="px-4 py-3 text-center text-gray-500 font-medium whitespace-nowrap">
                                                {(pagination.page - 1) * pagination.limit + index + 1}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <Link
                                                    to={`/admin/technician/complaint/${complaint.id}`}
                                                    className="font-medium text-green-600 hover:text-green-700 hover:underline"
                                                >
                                                    {complaint.report_number}
                                                </Link>
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
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center justify-center">
                                                    <Link
                                                        to={`/admin/technician/complaint/${complaint.id}`}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title={t('technician_dashboard.click_to_view') || 'View'}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between mt-6 pt-4 border-t">
                                <p className="text-sm text-gray-500">
                                    {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} {t('common.of') || 'of'} {pagination.total}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        disabled={pagination.page === 1}
                                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg font-medium">
                                        {pagination.page}
                                    </span>
                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        disabled={pagination.page === pagination.totalPages}
                                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
