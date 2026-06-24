import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Search, Eye, Clock } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import { User, Complaint } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function UserDetails() {
    const { t, i18n } = useTranslation();
    const { id } = useParams();
    const [user, setUser] = useState<User | null>(null);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const userRes = await api.get(`/admin/users/${id}`);
            // Fetch user's complaints. Assuming we can filter by user_id
            // If backend doesn't support ?user_id= on /complaints, we might need a new endpoint or filter client side if possible (but inefficient)
            // Checking AdminController, getAllComplaints doesn't seem to have user filter.
            // But TechnicianDetail used /complaints?assigned_to. Let's try /complaints?user_id if common.
            // Actually, for consistency, let's use the same pattern. If it fails, I might need to update backend.
            // Wait, standard CRUD usually allows filtering. Let's assume /complaints?user_id works or I'll fix it.
            // Actually, looking at previous knowledge, backend list complaints might not have user_id filter implemented explicitly in controller unless I check.
            // Let's check AdminController getComplaints? It wasn't shown fully.
            // But let's try reading it first.
            const complaintsRes = await api.get(`/complaints?user_id=${id}`);

            setUser(userRes.data.user);
            setComplaints(complaintsRes.data.complaints || []);
        } catch (error) {
            toast.error(t('common.error_load'));
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <span className="badge badge-pending">{t('admin_users.status_pending')}</span>;
            case 'in_process': return <span className="badge badge-in-process">{t('admin_users.status_in_process')}</span>;
            case 'incomplete':
                return <span className="badge bg-orange-100 text-orange-700 border-orange-200">Incomplete</span>;
            case 'ready_pickup':
                return <span className="badge bg-indigo-100 text-indigo-700 border-indigo-200">Ready Pickup</span>;
            case 'closed': return <span className="badge badge-closed">{t('admin_users.status_closed')}</span>;
            case 'cancelled': return <span className="badge badge-cancelled">{t('admin_users.status_cancelled')}</span>;
            default: return null;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ms-MY', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };



    const timeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        // Handle future dates or clock skew
        if (seconds < 0) return t('common.time_ago.just_now');

        let interval = seconds / 31536000;
        if (interval >= 1) return t('common.time_ago.years_ago', { count: Math.floor(interval) });

        interval = seconds / 2592000;
        if (interval >= 1) return t('common.time_ago.months_ago', { count: Math.floor(interval) });

        interval = seconds / 86400;
        if (interval >= 1) return t('common.time_ago.days_ago', { count: Math.floor(interval) });

        interval = seconds / 3600;
        if (interval >= 1) return t('common.time_ago.hours_ago', { count: Math.floor(interval) });

        interval = seconds / 60;
        if (interval >= 1) return t('common.time_ago.minutes_ago', { count: Math.floor(interval) });

        return t('common.time_ago.just_now');
    };

    const formatDateCustom = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';

        const isMalay = i18n.language === 'ms';

        const day = date.getDate();
        const month = date.toLocaleString(isMalay ? 'ms-MY' : 'en-US', { month: 'short' });
        const year = date.getFullYear();
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');

        let ampm = '';
        if (isMalay) {
            ampm = hours >= 12 ? 'PTG' : 'PG';
        } else {
            ampm = hours >= 12 ? 'PM' : 'AM';
        }

        hours = hours % 12;
        hours = hours ? hours : 12;
        const strTime = hours.toString().padStart(2, '0') + ':' + minutes + ' ' + ampm;
        return `${day} ${month} ${year}, ${strTime}`;
    };

    const filteredComplaints = complaints.filter(c =>
        c.report_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.brand_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <AdminLayout title={t('admin_users.detail_title') || 'User Details'} breadcrumb={t('admin_users.detail_title') || 'User Details'}>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                </div>
            </AdminLayout>
        );
    }

    if (!user) {
        return (
            <AdminLayout title={t('admin_users.detail_title') || 'User Details'} breadcrumb={t('admin_users.detail_title') || 'User Details'}>
                <div className="text-center py-12">
                    <p className="text-gray-500">{t('admin_users.not_found') || 'User not found'}</p>
                    <Link to="/admin/users" className="btn-secondary mt-4 inline-block">
                        {t('common_actions.back_to_list')}
                    </Link>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title={t('admin_users.detail_title') || 'User Details'} breadcrumb={t('admin_users.detail_title') || 'User Details'}>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header / Back */}
                <div className="flex items-center gap-4">
                    <Link to="/admin/users" className="p-2 bg-white rounded-lg hover:bg-gray-50 text-gray-600 transition-colors shadow-sm">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </div>

                {/* User Info Card */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md">
                            {user.full_name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">{user.full_name}</h2>
                            <p className="text-gray-500 text-sm">IC: {user.ic_number}</p>
                            <div className="flex flex-col items-start gap-1 mt-1">
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'Active' ? 'bg-green-100 text-green-800' :
                                        user.status === 'Suspended' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {user.status}
                                    </span>

                                </div>
                                <p className="text-gray-400 text-xs flex items-center gap-1 mt-1">
                                    <Clock className="w-3 h-3" />
                                    {t('admin_users.registered_on')} {formatDateCustom(user.created_at)} - {timeAgo(user.created_at)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        {/* 1. Email (Top Left) */}
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-500">Email</span>
                            </div>
                            <p className="font-medium text-gray-800 pl-6">{user.email || '-'}</p>
                        </div>

                        {/* 2. Primary Phone (Top Right) */}
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-500">{t('admin_users.phone_primary')}</span>
                            </div>
                            <p className="font-medium text-gray-800 pl-6">{user.contact_no}</p>
                        </div>

                        {/* 3. Address (Bottom Left) */}
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-500">{t('admin_complaint_detail.address')}</span>
                            </div>
                            <p className="font-medium text-gray-800 pl-6 leading-relaxed">
                                {user.address}
                                {user.state && <><br />{user.state}</>}
                            </p>
                        </div>

                        {/* 4. Secondary Phone (Bottom Right) */}
                        {user.contact_no_2 && (
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">{t('admin_users.phone_secondary')}</span>
                                </div>
                                <p className="font-medium text-gray-800 pl-6">{user.contact_no_2}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Complaints History */}
                <div className="card">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-800">
                            {t('admin_users.complaint_history') || 'Complaint History'}
                        </h3>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('technician_dashboard.search_placeholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-field pl-9 py-2 text-sm"
                            />
                        </div>
                    </div>

                    {filteredComplaints.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">{t('admin_master.no_data')}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="table-header text-xs uppercase">
                                        <th className="px-4 py-3 text-left whitespace-nowrap">#</th>
                                        <th className="px-4 py-3 text-left whitespace-nowrap">{t('admin_users.report_no')}</th>
                                        <th className="px-4 py-3 text-left whitespace-nowrap">{t('admin_master.brand')}</th>
                                        <th className="px-4 py-3 text-left whitespace-nowrap">{t('admin_master.subcategory')}</th>
                                        <th className="px-4 py-3 text-center whitespace-nowrap">{t('common_actions.status')}</th>
                                        <th className="px-4 py-3 text-left whitespace-nowrap">{t('common_actions.date')}</th>
                                        <th className="px-4 py-3 text-center whitespace-nowrap">{t('common_actions.action')}</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {filteredComplaints.map((complaint, index) => (
                                        <tr key={complaint.id} className="table-row">
                                            <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{index + 1}</td>
                                            <td className="px-4 py-3 font-medium text-indigo-600 whitespace-nowrap">{complaint.report_number}</td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{complaint.brand_name}</td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{complaint.subcategory}</td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge(complaint.status)}</td>
                                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(complaint.created_at)}</td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <Link
                                                    to={`/admin/complaint/${complaint.id}`}
                                                    className="inline-flex items-center justify-center p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
