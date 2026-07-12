import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Search, Eye, Clock, Key } from 'lucide-react';
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
                return <span className="badge badge-incomplete">{t('admin_users.status_incomplete')}</span>;
            case 'bawa_pulang':
                return <span className="badge badge-incomplete">{t('admin_users.status_bawa_pulang')}</span>;
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

                        {/* 2. Primary Phone */}
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-500">{t('admin_users.phone_primary')}</span>
                            </div>
                            <p className="font-medium text-gray-800 pl-6">{user.contact_no}</p>
                        </div>

                        {/* 3. Secondary Phone */}
                        {user.contact_no_2 && (
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">{t('admin_users.phone_secondary')}</span>
                                </div>
                                <p className="font-medium text-gray-800 pl-6">{user.contact_no_2}</p>
                            </div>
                        )}

                        {/* 4. Address */}
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

                        {/* 5. Username (IC Number) */}
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Key className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-500">Username</span>
                            </div>
                            <p className="font-medium text-gray-800 pl-6">{user.ic_number}</p>
                        </div>
                    </div>
                </div>

                {/* Password */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Key className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-800">Password</h3>
                                <p className="text-sm font-mono text-gray-800 bg-gray-100 px-3 py-1 rounded mt-1">{user.password || '-'}</p>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                if (!window.confirm('Reset kata laluan untuk pengguna ini?')) return;
                                try {
                                    const res = await api.post(`/admin/users/${id}/reset-password`);
                                    toast.success(`Password baru: ${res.data.new_password}`, { duration: 10000 });
                                    loadData();
                                } catch (err: any) {
                                    toast.error(err.response?.data?.error || 'Gagal reset password');
                                }
                            }}
                            className="btn-primary text-sm px-4 py-2"
                        >
                            Reset Password
                        </button>
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
                        <>
                            {/* Desktop View */}
                            <div className="hidden md:block overflow-x-auto">
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
                                            <tr key={complaint.id} className="table-row border-b last:border-b-0 border-gray-100 hover:bg-gray-50/50">
                                                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{index + 1}</td>
                                                <td className="px-4 py-3 font-medium text-indigo-600 whitespace-nowrap">{complaint.report_number}</td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{complaint.brand_name}</td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{complaint.subcategory}</td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge(complaint.status)}</td>
                                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(complaint.created_at)}</td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <Link
                                                        to={`/admin/complaint/${complaint.report_number}`}
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

                            {/* Mobile View (Card-based list) */}
                            <div className="md:hidden flex flex-col">
                                {filteredComplaints.map((complaint, index) => (
                                    <div key={complaint.id} className="bg-white border-b border-gray-200 p-4 last:border-b-0 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400 font-medium text-xs">#{index + 1}</span>
                                                    <Link
                                                        to={`/admin/complaint/${complaint.report_number}`}
                                                        className="text-indigo-600 hover:text-indigo-800 font-bold text-sm"
                                                    >
                                                        {complaint.report_number}
                                                    </Link>
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0">
                                                {getStatusBadge(complaint.status)}
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm mt-3 items-center">
                                            <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('complaint_form.subcategory') || 'Subcategory'}</span>
                                            <span className="text-gray-900 font-medium text-xs">{complaint.subcategory}</span>
                                            
                                            <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('complaint_form.brand') || 'Brand'}</span>
                                            <span className="text-gray-900 font-medium text-xs">{complaint.brand_name}</span>

                                            <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('admin_complaint_detail.defect_details') || 'Defect'}</span>
                                            <span className="text-gray-900 font-medium text-xs line-clamp-2" title={complaint.details || ''}>{complaint.details || '-'}</span>

                                            <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('common_actions.date') || 'Date'}</span>
                                            <span className="text-gray-900 font-medium text-xs">{formatDate(complaint.created_at)}</span>
                                        </div>
                                        
                                        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
                                            <Link
                                                to={`/admin/complaint/${complaint.report_number}`}
                                                className="w-full flex justify-center items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors text-sm font-medium border border-indigo-100"
                                            >
                                                <Eye className="w-4 h-4" />
                                                {t('complaint_list.view') || 'View Details'}
                                            </Link>
                                            <Link
                                                to={`/admin/complaint/${complaint.report_number}/track-repair`}
                                                className="w-full flex justify-center items-center gap-2 px-3 py-2 bg-white text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-medium border border-indigo-200"
                                            >
                                                <MapPin className="w-4 h-4" />{t('user_dashboard.view_track_repair', 'TRACK REPAIR')}</Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
