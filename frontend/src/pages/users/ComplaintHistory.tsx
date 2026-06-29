import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import UserLayout from '../../components/UserLayout';
import api from '../../services/api';
import { Complaint } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function ComplaintHistory() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        loadComplaints();
    }, []);

    const loadComplaints = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: '1',
                limit: '1000',
            });

            const response = await api.get(`/complaints?${params.toString()}`);

            // Sort by updated_at descending (most recently updated first)
            const sortedComplaints = response.data.complaints.sort((a: Complaint, b: Complaint) => {
                const dateA = new Date(a.updated_at || a.created_at).getTime();
                const dateB = new Date(b.updated_at || b.created_at).getTime();
                return dateB - dateA;
            });

            setAllComplaints(sortedComplaints);
        } catch (error) {
            toast.error(t('common.error_load'));
        } finally {
            setIsLoading(false);
        }
    };

    // Frontend real-time search filter
    const filteredComplaints = useMemo(() => {
        let results = allComplaints;

        // Filter by status
        if (statusFilter !== 'all') {
            results = results.filter(c => c.status === statusFilter);
        }

        // Filter by search term
        if (search.trim()) {
            const searchTerm = search.toLowerCase().trim();

            results = results.filter(complaint => {
                // Search by report number
                const reportMatch = complaint.report_number?.toLowerCase().includes(searchTerm);

                // Search by subcategory
                const subcategoryMatch = complaint.subcategory?.toLowerCase().includes(searchTerm);

                // Search by brand
                const brandMatch = complaint.brand_name?.toLowerCase().includes(searchTerm);

                // Search by category
                const categoryMatch = complaint.categories?.name?.toLowerCase().includes(searchTerm);

                // Search by date
                const dateStr = new Date(complaint.created_at).toLocaleDateString('ms-MY', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                const dateMatch = dateStr.includes(searchTerm) || complaint.created_at?.includes(searchTerm);

                return reportMatch || subcategoryMatch || brandMatch || categoryMatch || dateMatch;
            });
        }

        return results;
    }, [allComplaints, search, statusFilter]);

    // Reset page when search or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter]);

    // Pagination computed from filtered results
    const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);
    const paginatedComplaints = filteredComplaints.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // [ANTIGRAVITY PARSER] Helper for payload generation (Universal Parser logic)
    const getStatusPayload = (complaint: Complaint) => {
        const { status, technicians, updated_at, created_at, report_number } = complaint;
        const dateToUse = status === 'pending' && !technicians ? created_at : updated_at;

        const dateObj = new Date(dateToUse);

        // Use exact formatting as requested: "03 Feb 2026"
        const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const techName = technicians?.name || technicians?.username || 'Technician';

        if (status === 'in_process') {
            return JSON.stringify({
                key: 'notif_processing_user',
                params: {
                    id: report_number,
                    name: techName,
                    date: dateStr,
                    time: timeStr
                }
            });
        }

        if (status === 'closed') {
            // Fallback or specific closed message if needed, matching UserDashboard
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
    };

    // [ANTIGRAVITY PARSER] Handle JSON status messages
    const renderStatusMessage = (complaint: Complaint) => {
        // 1. Try to get payload from local generation
        const generatedPayload = getStatusPayload(complaint);

        // 2. Or fallback to existing fields
        const rawMsg = generatedPayload || (complaint as any).status_message || (complaint as any).status_description || complaint.status;

        if (!rawMsg) return '-';
        try {
            // Try to parse message as JSON
            const data = JSON.parse(rawMsg);
            if (data && data.key) {
                // Terjemah guna Key + Params (Antigravity simplified)
                // Priority: flat key -> body key -> default
                return t(`notification.${data.key}`, { ...data.params }) || t(`notification.${data.key}_body`, { ...data.params }) || rawMsg;
            }
        } catch (e) {
            // Not JSON, return original string
            return rawMsg;
        }
        return rawMsg;
    };

    const getStatusBadge = (complaint: Complaint) => {
        const { status, technicians } = complaint;

        if (status === 'pending') {
            if (technicians) {
                return <span className="badge bg-blue-100 text-blue-700 border-blue-200">{t('table.assigned') || 'Diagihkan'}</span>;
            }
            return <span className="badge badge-pending">{t('admin_users.status_pending')}</span>;
        }

        switch (status) {
            case 'in_process':
                return <span className="badge badge-in-process">{t('admin_users.status_in_process')}</span>;
            case 'incomplete':
                return <span className="badge bg-orange-100 text-orange-700 border-orange-200">Incomplete</span>;
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







    return (
        <UserLayout title={t('user_dashboard.title_history')} breadcrumb={t('user_dashboard.title_history')}>
            {/* Back Button */}


            <div className="card">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1">
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
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input-field w-auto"
                        >
                            <option value="all">{t('admin_users.all_status') || 'All Status'}</option>
                            <option value="pending">{t('admin_users.status_pending')}</option>
                            <option value="in_process">{t('admin_users.status_in_process')}</option>
                            <option value="closed">{t('admin_users.status_closed')}</option>
                            <option value="cancelled">{t('admin_users.status_cancelled') || 'Dibatalkan'}</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
                    </div>
                ) : paginatedComplaints.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">{t('admin_master.no_data')}</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="table-header">
                                        <th className="text-center px-4 py-3 w-12 whitespace-nowrap">#</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('admin_users.report_no') || 'Report No'}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('admin_master.category')}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('admin_master.subcategory')}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('admin_master.brand')}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('common_actions.status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedComplaints.map((complaint, index) => (
                                        <tr key={complaint.id} className="table-row">
                                            <td className="px-4 py-3 text-center text-gray-500 font-medium whitespace-nowrap">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <Link
                                                    to={`/users/complaint/${complaint.id}`}
                                                    className="text-primary-600 hover:text-primary-700 font-medium"
                                                >
                                                    {complaint.report_number}
                                                </Link>
                                                <Link
                                                    to={`/users/complaint/${complaint.id}/track-repair`}
                                                    className="inline-block mt-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-0.5 rounded transition-colors"
                                                >
                                                    TRACK REPAIR
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                                {complaint.categories?.name || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{complaint.subcategory}</td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{complaint.brand_name}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    {getStatusBadge(complaint)}
                                                    <div className="mt-1">
                                                        <div className="mt-1 text-xs text-gray-500">
                                                            {renderStatusMessage(complaint) as React.ReactNode}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-6 pt-4 border-t">
                                <p className="text-sm text-gray-500">
                                    {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredComplaints.length)} {t('common.of') || 'of'} {filteredComplaints.length}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-lg font-medium">
                                        {currentPage}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                        disabled={currentPage === totalPages}
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
        </UserLayout>
    );
}
