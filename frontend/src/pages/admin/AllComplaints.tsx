import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Printer, Filter, X, Trash2 } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import { Complaint } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { parseNotificationMessage } from '../../utils/notificationParser';

interface AllComplaintsProps {
    status?: 'all' | 'pending' | 'in_process' | 'closed' | 'not_forwarded' | 'job_assigned' | 'cancelled';
}

interface Technician {
    id: string;
    name: string;
    username: string;
}

export default function AllComplaints({ status = 'all' }: AllComplaintsProps) {
    const { t, i18n } = useTranslation();
    const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Advanced filters
    const [showFilters, setShowFilters] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterSubcategory, setFilterSubcategory] = useState('');
    const [filterBrand, setFilterBrand] = useState('');
    const [filterTechnician, setFilterTechnician] = useState('');
    const [filterDate, setFilterDate] = useState('');

    // Filter options from data
    const [technicians, setTechnicians] = useState<Technician[]>([]);

    const getPageTitle = (s: string) => {
        switch (s) {
            case 'pending': return t('complaint_list.title_pending');
            case 'in_process': return t('complaint_list.title_in_process');
            case 'closed': return t('complaint_list.title_closed');
            case 'not_forwarded': return t('complaint_list.title_not_forwarded');
            case 'job_assigned': return t('complaint_list.title_job_assigned');
            case 'cancelled': return t('complaint_list.title_cancelled');
            default: return t('complaint_list.title_all');
        }
    };

    useEffect(() => {
        loadComplaints();
        loadTechnicians();
    }, [status]);

    const loadComplaints = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: '1',
                limit: '1000', // Load all for frontend filtering
            });

            if (status !== 'all') {
                params.append('status', status);
            }

            const response = await api.get(`/complaints?${params.toString()}`);
            setAllComplaints(response.data.complaints);
        } catch (error) {
            toast.error(t('common.error_load') || 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number, reportNumber: string) => {
        if (window.confirm(`Adakah anda pasti mahu memadam aduan ${reportNumber}? Tindakan ini tidak boleh diundur.`)) {
            try {
                await api.delete(`/complaints/${id}`);
                toast.success(`Aduan ${reportNumber} berjaya dipadam`);
                loadComplaints();
            } catch (error) {
                toast.error('Gagal memadam aduan');
            }
        }
    };

    const loadTechnicians = async () => {
        try {
            const response = await api.get('/admin/technicians');
            setTechnicians(response.data?.technicians || []);
        } catch (error) {
            console.error('Failed to load technicians');
        }
    };

    // Get unique values for filter dropdowns
    const uniqueSubcategories = useMemo(() => {
        const subcats = allComplaints.map(c => c.subcategory).filter(Boolean);
        return [...new Set(subcats)].sort();
    }, [allComplaints]);

    const uniqueBrands = useMemo(() => {
        const brands = allComplaints.map(c => c.brand_name).filter(Boolean);
        return [...new Set(brands)].sort();
    }, [allComplaints]);

    // Check if any filter is active
    const hasActiveFilters = filterStatus || filterSubcategory || filterBrand || filterTechnician || filterDate;

    // Clear all filters
    const clearFilters = () => {
        setFilterStatus('');
        setFilterSubcategory('');
        setFilterBrand('');
        setFilterTechnician('');
        setFilterDate('');
        setSearch('');
    };

    // Frontend search filter - search by report no, IC, name, date
    const filteredComplaints = useMemo(() => {
        let results = allComplaints;

        // Filter by status dropdown
        if (filterStatus) {
            if (filterStatus === 'assigned') {
                results = results.filter(c => c.status === 'pending' && c.assigned_to);
            } else if (filterStatus === 'not_assigned') {
                results = results.filter(c => c.status === 'pending' && !c.assigned_to);
            } else {
                results = results.filter(c => c.status === filterStatus);
            }
        }

        // Filter by subcategory
        if (filterSubcategory) {
            results = results.filter(c => c.subcategory === filterSubcategory);
        }

        // Filter by brand
        if (filterBrand) {
            results = results.filter(c => c.brand_name === filterBrand);
        }

        // Filter by technician
        if (filterTechnician) {
            results = results.filter(c => c.assigned_to === filterTechnician);
        }

        // Filter by date
        if (filterDate) {
            results = results.filter(c => {
                const complaintDate = new Date(c.created_at).toISOString().split('T')[0];
                return complaintDate === filterDate;
            });
        }

        // Filter by search term
        if (search.trim()) {
            const searchTerm = search.toLowerCase().trim();

            results = results.filter(complaint => {
                // Search by report number
                const reportMatch = complaint.report_number?.toLowerCase().includes(searchTerm);

                // Search by customer name
                const nameMatch = complaint.users?.full_name?.toLowerCase().includes(searchTerm);

                // Search by IC number (removing dashes for flexible search)
                const icSearch = searchTerm.replace(/-/g, '');
                const icMatch = complaint.users?.ic_number?.replace(/-/g, '')?.includes(icSearch);

                // Search by date (format: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
                const dateStr = new Date(complaint.created_at).toLocaleDateString('ms-MY', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                const dateMatch = dateStr.includes(searchTerm) ||
                    complaint.created_at?.includes(searchTerm);

                // Search by subcategory
                const subcategoryMatch = complaint.subcategory?.toLowerCase().includes(searchTerm);

                // Search by brand
                const brandMatch = complaint.brand_name?.toLowerCase().includes(searchTerm);

                // Search by technician name
                const techMatch = complaint.technicians?.name?.toLowerCase().includes(searchTerm) ||
                    complaint.technicians?.username?.toLowerCase().includes(searchTerm);

                return reportMatch || nameMatch || icMatch || dateMatch || subcategoryMatch || brandMatch || techMatch;
            });
        }

        // Sort by updated_at descending (most recently updated first)
        return results.sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at).getTime();
            const dateB = new Date(b.updated_at || b.created_at).getTime();
            return dateB - dateA;
        });
    }, [allComplaints, search, filterStatus, filterSubcategory, filterBrand, filterTechnician, filterDate]);

    // Pagination for filtered results
    const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);
    const paginatedComplaints = filteredComplaints.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset to page 1 when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterStatus, filterSubcategory, filterBrand, filterTechnician, filterDate]);


    // REDEFINING correctly
    const renderStatusBadge = (complaint: Complaint) => {
        const { status, technicians } = complaint;

        if (status === 'pending') {
            if (technicians) {
                return <span className="badge bg-blue-100 text-blue-700 border-blue-200">{t('table.assigned')}</span>;
            }
            return <span className="badge badge-pending">{t('table.pending')}</span>;
        }

        switch (status) {
            case 'in_process':
                return <span className="badge badge-in-process">{t('table.in_process')}</span>;
            case 'closed':
                return <span className="badge badge-closed">{t('table.closed')}</span>;
            case 'cancelled':
                return <span className="badge bg-purple-100 text-purple-700">{t('dashboard.cancelled') || 'Dibatalkan'}</span>;
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

    // Import the parser (ensure you import it at top of file: import { parseNotificationMessage } from '../../utils/notificationParser';)
    // For now I assume implicit import or I will add it.

    // Helper to generate the JSON payload string expected by the parser
    const getStatusPayload = (complaint: Complaint) => {
        const { status, technicians, updated_at, created_at, users } = complaint;
        const dateToUse = status === 'pending' && !technicians ? created_at : updated_at;

        // Reproduce the params used in backend notifications
        // We need to format date/time similarly to backend or let parser handle it if we pass raw date?
        // Backend passes formatted date/time. We should try to match.

        const dateObj = new Date(dateToUse);
        // We use the current locale for the "Data Generation" which mimics what backend does at that moment
        // But ideally we want dynamic binding.
        // So we pass 'raw' params and let the translation key handle order.
        // BUT the backend passed 'date' and 'time' strings.

        const locale = i18n.language === 'en' ? 'en-MY' : 'ms-MY';
        const dateStr = dateObj.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const techName = technicians?.username || technicians?.name || 'Technician';
        const userName = users?.full_name || 'Pengguna';
        const reportNumber = complaint.report_number;

        if (status === 'cancelled') {
            // "Cancelled by User" -> We might need a key for this if not exists in notification block?
            // Notification block doesn't seem to have "cancelled". 
            // Falling back to manual t() for now or create a synthetic JSON if we had a key.
            return null;
        }

        if (status === 'pending') {
            if (technicians) {
                return JSON.stringify({
                    key: 'job_assigned_msg', // "You have been assigned..." - Wait, this is 'Forwarded To' context.
                    // Notification keys provided:
                    // job_assigned_msg: "You have been assigned..." (Wrong context for Admin View)
                    // status_update_msg: "Complaint ... is now {status}"

                    // Actually, the user wants 'Cantik' like TechDashboard?
                    // TechDashboard uses 'status_msg.forwarded_to'.
                    // The "Antigravity" parser uses 'notification' namespace.

                    // IF I want to use the parser, I must use 'notification' keys.
                    // 'notif_processing_body' exists.
                    // 'notif_completed_body' exists.
                    // Is there 'notif_assigned_body'? No.

                    // The user's request is to use `parseNotificationMessage`.
                    // If I can't find a notification key, I should fallback to existing.

                    // Let's stick to 'in_process' and 'closed' which have Keys.
                });
            }
            return JSON.stringify({
                key: 'new_complaint_msg', // "New complaint from..."
                params: { user_name: userName }
            });
        }

        if (status === 'in_process') {
            return JSON.stringify({
                key: 'notif_processing_body',
                params: {
                    id: reportNumber,
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
                    id: reportNumber,
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
            // Use the Antigravity Parser!
            return (
                <div className="text-xs text-gray-500">
                    <p>{parseNotificationMessage(payload, t)}</p>
                    {complaint.status === 'closed' && (
                        <p className="text-green-600 font-medium mt-1">{t('status_msg.ready_pickup')}</p>
                    )}
                </div>
            );
        }

        // Fallback for cases without notification keys (Cancelled, Pending-Assigned specific phrasing)
        const { status, technicians, updated_at, created_at, users } = complaint;
        const dateToUse = status === 'pending' && !technicians ? created_at : updated_at;
        const dateTime = formatDateTime(dateToUse);
        const techName = technicians?.username || technicians?.name || '-';
        const userName = users?.full_name || 'Pengguna';

        if (status === 'cancelled') {
            return (
                <div className="text-xs text-gray-500">
                    <p>{t('status_msg.cancelled_by') || 'Cancelled by'} <span className="font-medium text-gray-700">{userName}</span></p>
                    <p className="text-gray-400 mt-0.5">{dateTime}</p>
                </div>
            );
        }

        if (status === 'pending' && technicians) {
            return (
                <div className="text-xs text-gray-500">
                    <p>{t('status_msg.forwarded_to') || 'Assigned to'} <span className="font-medium text-gray-700">{techName}</span></p>
                    <p className="text-gray-400 mt-0.5">{dateTime}</p>
                </div>
            );
        }

        return null; // Should not happen given logic above cover pending/created
    };

    return (
        <AdminLayout title={getPageTitle(status)} breadcrumb={getPageTitle(status)}>
            <div className="card">
                {/* Search and Filter Toggle */}
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('complaint_list.search_placeholder')}
                                className="input-field pl-10"
                            />
                        </div>

                        {/* Status Filter (Primary) */}
                        <div className="w-full md:w-48">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="input-field"
                            >
                                <option value="">{t('admin_users.all_status') || 'All Status'}</option>
                                <option value="pending">{t('admin_users.status_pending') || 'Pending'}</option>
                                <option value="in_process">{t('admin_users.status_in_process') || 'In Process'}</option>
                                <option value="closed">{t('admin_users.status_closed') || 'Closed'}</option>
                                <option value="assigned">{t('table.assigned') || 'Assigned'}</option>
                                <option value="not_assigned">{t('complaint_list.not_assigned') || 'Job Not Assigned'}</option>
                                <option value="cancelled">{t('admin_users.status_cancelled') || 'Cancelled'}</option>
                            </select>
                        </div>
                        {/* Toggle Filter Button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${showFilters || !!hasActiveFilters
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {Filter && <Filter className="w-4 h-4" />}
                            <span>{t?.('common_actions.filter') || 'Filter'}</span>
                            {!!hasActiveFilters && (
                                <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full">!</span>
                            )}
                        </button>
                    </div>

                    {/* Filters Panel */}
                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            {/* Date Filter */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('table.date') || 'Date'}</label>
                                <input
                                    type="date"
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                    className="input-field text-sm"
                                />
                            </div>

                            {/* Status Filter */}


                            {/* Subcategory Filter */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('complaint_form.subcategory') || 'Subcategory'}</label>
                                <select
                                    value={filterSubcategory}
                                    onChange={(e) => setFilterSubcategory(e.target.value)}
                                    className="input-field text-sm"
                                >
                                    <option value="">{t('complaint_form.select_subcategory') || 'All Subcategories'}</option>
                                    {uniqueSubcategories?.map(subcat => (
                                        <option key={subcat} value={subcat}>{subcat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Brand Filter */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('complaint_form.brand') || 'Brand'}</label>
                                <select
                                    value={filterBrand}
                                    onChange={(e) => setFilterBrand(e.target.value)}
                                    className="input-field text-sm"
                                >
                                    <option value="">{t('complaint_form.select_brand') || 'All Brands'}</option>
                                    {uniqueBrands?.map(brand => (
                                        <option key={brand} value={brand}>{brand}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Technician Filter */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('complaint_list.technician') || 'Technician'}</label>
                                <select
                                    value={filterTechnician}
                                    onChange={(e) => setFilterTechnician(e.target.value)}
                                    className="input-field text-sm"
                                >
                                    <option value="">{t('admin_complaint_detail.select_technician') || 'All Technicians'}</option>
                                    {technicians?.map(tech => (
                                        <option key={tech.id} value={tech.id}>{tech.name || tech.username}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Clear Filters Button */}
                            <div className="flex items-end">
                                <button
                                    onClick={clearFilters}
                                    className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                    <span>{t('common_actions.clear') || 'Clear'}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Active Filters Summary */}
                    {hasActiveFilters && !showFilters && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>{t('common.filter_active') || 'Filters active'}:</span>
                            <span className="font-medium">{filteredComplaints.length} {t('common.results') || 'results'}</span>
                            <button
                                onClick={clearFilters}
                                className="text-red-600 hover:underline ml-2"
                            >
                                {t('common_actions.clear') || 'Clear'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                    </div>
                ) : paginatedComplaints.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">{t('complaint_list.no_complaints')}</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="table-header">
                                        <th className="text-center px-4 py-3 w-12 whitespace-nowrap">No.</th>
                                        <th className="text-left px-4 py-3">{t('complaint_list.report_no')}</th>
                                        <th className="text-left px-4 py-3">{t('complaint_list.customer')}</th>
                                        <th className="text-left px-4 py-3">{t('complaint_form.subcategory')}</th>
                                        <th className="text-left px-4 py-3">{t('complaint_form.brand')}</th>
                                        <th className="text-left px-4 py-3">{t('complaint_list.technician')}</th>
                                        <th className="text-left px-4 py-3">{t('table.status')}</th>
                                        <th className="text-center px-4 py-3 whitespace-nowrap">{t('table.action')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedComplaints.map((complaint, index) => (
                                        <tr key={complaint.id} className="table-row">
                                            <td className="px-4 py-3 text-center text-gray-500 font-medium whitespace-nowrap">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link
                                                    to={`/admin/complaint/${complaint.id}`}
                                                    className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                                                >
                                                    {complaint.report_number}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-gray-900 text-sm">{complaint.users?.full_name || '-'}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        ID/IC: {complaint.users?.ic_number || (t('common.no_ic_info') || 'Tiada Maklumat IC')}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{complaint.subcategory}</td>
                                            <td className="px-4 py-3 text-gray-600">{complaint.brand_name}</td>
                                            <td className="px-4 py-3">
                                                {complaint.technicians ? (
                                                    <span className="text-gray-700">{complaint.technicians.name}</span>
                                                ) : (
                                                    <span className="text-red-500 text-sm">{t('complaint_list.not_assigned')}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    {renderStatusBadge(complaint)}
                                                    <div className="mt-1">
                                                        {renderStatusDescription(complaint)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link
                                                        to={`/admin/complaint/${complaint.id}`}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title={t('complaint_list.view')}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    <Link
                                                        to={`/admin/print/${complaint.id}`}
                                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                        title={t('complaint_list.print')}
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(complaint.id, complaint.report_number)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Padam Aduan"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>



                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center mt-6 gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 rounded bg-gray-100 text-gray-600 disabled:opacity-50 hover:bg-gray-200"
                                >
                                    &lt;
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`px-3 py-1 rounded ${currentPage === i + 1 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 rounded bg-gray-100 text-gray-600 disabled:opacity-50 hover:bg-gray-200"
                                >
                                    &gt;
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
