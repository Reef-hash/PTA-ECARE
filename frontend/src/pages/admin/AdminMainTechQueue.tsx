import { useEffect, useState } from 'react';
import { Wrench, AlertTriangle, Eye, AlertCircle, Clock, UserCheck, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import { Complaint, DashboardStats } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function AdminMainTechQueue() {
    const { t } = useTranslation();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        total: 0, pending: 0, in_process: 0, closed: 0, not_forwarded: 0, assigned: 0, cancelled: 0, incomplete: 0,
        incomplete_total: 0, incomplete_not_assigned: 0, incomplete_assigned: 0, incomplete_completed: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('incomplete');

    useEffect(() => {
        loadStats();
    }, []);

    useEffect(() => {
        loadComplaints();
    }, [activeFilter]);

    const loadStats = async () => {
        try {
            const res = await api.get('/admin/stats');
            setStats(res.data.stats);
        } catch (error) {
            console.error('Failed to load stats', error);
        }
    };

    const loadComplaints = async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`/complaints?status=${activeFilter}`);
            setComplaints(response.data.complaints || []);
        } catch (error) {
            toast.error('Gagal memuatkan data');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('ms-MY', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            return '-';
        }
    };

    // Helper to extract the latest remark and transport details
    const getIncompleteDetails = (complaint: Complaint) => {
        if (!complaint.remarks || !Array.isArray(complaint.remarks) || complaint.remarks.length === 0) return { remark: '-', transport: '-' };
        
        try {
            const sorted = [...complaint.remarks].sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateB - dateA;
            });
            // Find the remark that caused the incomplete status
            const incompleteRemark = sorted.find(r => r.status === 'incomplete' && !r.remark?.includes('__FORWARD__')) 
                || sorted.find(r => r.status === 'incomplete') 
                || sorted[0];

            const rawRemark = incompleteRemark?.remark || '-';
            const displayRemark = rawRemark.includes('__FORWARD__') ? rawRemark.split('__FORWARD__')[0].trim() || '-' : rawRemark;
            
            return {
                remark: displayRemark,
                transport: incompleteRemark?.note_transport || '-',
                checking: incompleteRemark?.checking || '-'
            };
        } catch (e) {
            return { remark: '-', transport: '-', checking: '-' };
        }
    };

    const statCards = [
        { label: t('main_tech.dashboard.cards.incomplete', 'Incomplete / Bawa Pulang'), value: stats.incomplete, icon: AlertCircle, color: 'orange', filter: 'incomplete' },
        { label: t('main_tech.dashboard.cards.not_forwarded', 'Not Assigned'), value: stats.not_forwarded, icon: Clock, color: 'red', filter: 'not_forwarded' },
        { label: t('main_tech.dashboard.cards.assigned', 'Job Assigned'), value: stats.assigned, icon: UserCheck, color: 'teal', filter: 'job_assigned' },
        { label: t('main_tech.dashboard.cards.closed', 'Complete'), value: stats.closed, icon: CheckCircle, color: 'green', filter: 'closed' },
    ];

    const getColorClasses = (color: string) => {
        const colors: Record<string, { bg: string; icon: string; border: string }> = {
            orange: { bg: 'bg-orange-100', icon: 'text-orange-600', border: 'border-l-orange-500' },
            red: { bg: 'bg-red-100', icon: 'text-red-600', border: 'border-l-red-500' },
            teal: { bg: 'bg-teal-100', icon: 'text-teal-600', border: 'border-l-teal-500' },
            green: { bg: 'bg-green-100', icon: 'text-green-600', border: 'border-l-green-500' },
        };
        return colors[color] || colors.orange;
    };

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Wrench className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{t('main_tech.dashboard.title', 'Pantauan Main Tech')}</h1>
                            <p className="text-gray-500 mt-1">{t('main_tech.dashboard.subtitle', 'Pantauan senarai mesin di bawah pengurusan Main Technician')}</p>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {statCards.map((card) => {
                        const Icon = card.icon;
                        const colors = getColorClasses(card.color);
                        const isActive = activeFilter === card.filter;
                        return (
                            <button
                                key={card.label}
                                onClick={() => setActiveFilter(card.filter)}
                                className={`text-left w-full rounded-xl shadow-sm border p-5 ${colors.border} border-l-4 transition-all duration-200 ${
                                    isActive ? 'bg-gray-50 ring-2 ring-indigo-500 border-indigo-500 scale-[1.02]' : 'bg-white border-gray-100 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className={`text-xs uppercase font-medium ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>{card.label}</p>
                                        <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
                                    </div>
                                    <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
                                        <Icon className={`w-5 h-5 ${colors.icon}`} />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="card overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800">
                            {statCards.find(c => c.filter === activeFilter)?.label || t('main_tech.dashboard.list_title', 'Senarai Menunggu Tindakan Main Technician')}
                        </h2>
                        <span className={`badge font-medium px-3 py-1 ${getColorClasses(statCards.find(c => c.filter === activeFilter)?.color || 'orange').bg} ${getColorClasses(statCards.find(c => c.filter === activeFilter)?.color || 'orange').icon.replace('text-', 'text-')}`}>
                            {complaints.length} Mesin
                        </span>
                    </div>

                    <div className="overflow-hidden sm:rounded-lg">
                        {/* Mobile Layout (List-Item Compact) */}
                        <div className="block md:hidden border-t border-gray-200">
                            {isLoading ? (
                                <div className="p-8 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-3">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent"></div>
                                        Memuatkan data...
                                    </div>
                                </div>
                            ) : complaints.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                        <AlertTriangle className="w-12 h-12 mb-3 text-gray-300" />
                                        <p className="text-lg font-medium text-gray-600">Tiada rekod dijumpai</p>
                                    </div>
                                </div>
                            ) : (
                                complaints.map((complaint) => {
                                    const details = getIncompleteDetails(complaint);
                                    const isAssignedTo = complaint.technicians?.name || complaint.assigned_to || 'Tidak Diketahui';

                                    return (
                                        <div key={complaint.id} className="bg-white border-b border-gray-200 p-4 last:border-b-0 hover:bg-gray-50 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-gray-50 rounded-lg">
                                                        <Wrench className="w-4 h-4 text-gray-500" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{complaint.report_number || `ADU-${complaint.id}`}</div>
                                                        <div className="text-xs text-gray-500 mt-1">{formatDate(complaint.created_at)}</div>
                                                    </div>
                                                </div>
                                                <Link
                                                    to={`/admin/complaint/${complaint.report_number}`}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100"
                                                    title="Lihat"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                            </div>
                                            
                                            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm mt-3 items-center">
                                                <span className="text-gray-500 text-[11px] uppercase tracking-wider">Pelanggan</span>
                                                <div>
                                                    <div className="text-gray-900 font-medium text-xs">{complaint.users?.full_name || '-'}</div>
                                                    <div className="text-xs text-gray-500 line-clamp-1">{complaint.users?.address || '-'}</div>
                                                </div>

                                                <span className="text-gray-500 text-[11px] uppercase tracking-wider">Juruteknik</span>
                                                <div>
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
                                                        {isAssignedTo}
                                                    </span>
                                                </div>

                                                <span className="text-gray-500 text-[11px] uppercase tracking-wider">Sebab</span>
                                                <span className="text-gray-900 text-xs line-clamp-2">
                                                    {activeFilter === 'incomplete' ? details.remark : complaint.details}
                                                </span>

                                                <span className="text-gray-500 text-[11px] uppercase tracking-wider">Jarak</span>
                                                <span className="text-gray-900 text-xs font-medium">
                                                    {activeFilter === 'incomplete' ? details.transport : '-'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Desktop Layout (Table) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">No. Laporan / Tarikh</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pelanggan</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Juruteknik Asal</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sebab Bawa Pulang</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Jarak Transport</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Tindakan</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                <div className="flex justify-center items-center gap-3">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent"></div>
                                                    Memuatkan data...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : complaints.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-400">
                                                    <AlertTriangle className="w-12 h-12 mb-3 text-gray-300" />
                                                    <p className="text-lg font-medium text-gray-600">Tiada rekod dijumpai</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        complaints.map((complaint) => {
                                            const details = getIncompleteDetails(complaint);
                                            const isAssignedTo = complaint.technicians?.name || complaint.assigned_to || 'Tidak Diketahui';

                                            return (
                                                <tr key={complaint.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-gray-50 rounded-lg">
                                                                <Wrench className="w-4 h-4 text-gray-500" />
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-gray-900">{complaint.report_number || `ADU-${complaint.id}`}</div>
                                                                <div className="text-xs text-gray-500 mt-1">{formatDate(complaint.created_at)}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-medium text-gray-900">{complaint.users?.full_name || '-'}</div>
                                                        <div className="text-xs text-gray-500 mt-1 max-w-[200px] truncate" title={complaint.users?.address}>
                                                            {complaint.users?.address || '-'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                                            {isAssignedTo}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {activeFilter === 'incomplete' ? (
                                                            <p className="text-sm text-gray-600 line-clamp-2" title={details.remark}>
                                                                {details.remark}
                                                            </p>
                                                        ) : (
                                                            <p className="text-sm text-gray-600 line-clamp-2">
                                                                {complaint.details}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="text-sm font-medium text-gray-700">
                                                            {activeFilter === 'incomplete' ? details.transport : '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <Link
                                                            to={`/admin/complaint/${complaint.report_number}`}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded transition-colors shadow-sm"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            Lihat
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
