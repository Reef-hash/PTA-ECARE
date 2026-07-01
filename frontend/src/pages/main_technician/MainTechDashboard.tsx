import { useEffect, useState, useCallback } from 'react';
import { Wrench, AlertTriangle, ArrowRightCircle, AlertCircle, Clock, UserCheck, CheckCircle, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import MainTechLayout from '../../components/MainTechLayout';
import api from '../../services/api';
import { Complaint, DashboardStats } from '../../types';
import toast from 'react-hot-toast';
import ForwardJobModal from './ForwardJobModal';
import { useTranslation } from 'react-i18next';

type IncompleteFilter = 'incomplete' | 'incomplete_not_assigned' | 'incomplete_assigned' | 'incomplete_completed';

export default function MainTechDashboard() {
    const { t } = useTranslation();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        total: 0, pending: 0, in_process: 0, closed: 0, not_forwarded: 0, assigned: 0,
        cancelled: 0, incomplete: 0,
        incomplete_total: 0, incomplete_not_assigned: 0, incomplete_assigned: 0, incomplete_completed: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
    const [activeFilter, setActiveFilter] = useState<IncompleteFilter>('incomplete');

    const loadStats = useCallback(async () => {
        try {
            const res = await api.get('/admin/stats');
            setStats(res.data.stats);
        } catch (error) {
            console.error('Failed to load stats', error);
        }
    }, []);

    const loadComplaints = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`/complaints?status=${activeFilter}&limit=1000`);
            setComplaints(response.data.complaints || response.data.data || []);
        } catch (error) {
            toast.error(t('common.error_load') || 'Gagal memuatkan data papan pemuka');
        } finally {
            setIsLoading(false);
        }
    }, [activeFilter, t]);

    useEffect(() => {
        loadStats();
        loadComplaints();
    }, [loadStats, loadComplaints]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ms-MY', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Helper to extract the latest incomplete remark and technician action details
    const getIncompleteDetails = (complaint: Complaint) => {
        if (!complaint.remarks || complaint.remarks.length === 0) return { remark: '-', transport: '-', checking: '-' };
        const sorted = [...complaint.remarks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const incompleteRemark = sorted.find(r => r.status === 'incomplete') || sorted[0];

        return {
            remark: incompleteRemark.remark || '-',
            transport: incompleteRemark.note_transport || '-',
            checking: incompleteRemark.checking || '-'
        };
    };

    const handleForwardSuccess = useCallback(() => {
        setSelectedComplaint(null);
        loadStats();
        loadComplaints();
    }, [loadStats, loadComplaints]);

    // Incomplete lifecycle cards. Each maps to a backend status filter so the
    // list below the cards reflects the selected sub-state.
    const statCards = [
        { label: t('main_tech.dashboard.cards.incomplete'), value: stats.incomplete_total, icon: AlertCircle, color: 'orange', filter: 'incomplete' as IncompleteFilter },
        { label: t('main_tech.dashboard.cards.not_forwarded'), value: stats.incomplete_not_assigned, icon: Clock, color: 'red', filter: 'incomplete_not_assigned' as IncompleteFilter },
        { label: t('main_tech.dashboard.cards.assigned'), value: stats.incomplete_assigned, icon: UserCheck, color: 'teal', filter: 'incomplete_assigned' as IncompleteFilter },
        { label: t('main_tech.dashboard.cards.closed'), value: stats.incomplete_completed, icon: CheckCircle, color: 'green', filter: 'incomplete_completed' as IncompleteFilter },
    ];

    const getColorClasses = (color: string) => {
        const colors: Record<string, { bg: string; icon: string; border: string; badge: string }> = {
            orange: { bg: 'bg-orange-100', icon: 'text-orange-600', border: 'border-l-orange-500', badge: 'bg-orange-100 text-orange-700' },
            red: { bg: 'bg-red-100', icon: 'text-red-600', border: 'border-l-red-500', badge: 'bg-red-100 text-red-700' },
            teal: { bg: 'bg-teal-100', icon: 'text-teal-600', border: 'border-l-teal-500', badge: 'bg-teal-100 text-teal-700' },
            green: { bg: 'bg-green-100', icon: 'text-green-600', border: 'border-l-green-500', badge: 'bg-green-100 text-green-700' },
        };
        return colors[color] || colors.orange;
    };

    const activeCard = statCards.find(c => c.filter === activeFilter);
    const activeColor = getColorClasses(activeCard?.color || 'orange');

    return (
        <MainTechLayout breadcrumb={t('sidebar.dashboard')}>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Wrench className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{t('main_tech.dashboard.title')}</h1>
                            <p className="text-gray-500 mt-1">{t('main_tech.dashboard.subtitle')}</p>
                        </div>
                    </div>
                </div>

                {/* Stats Grid - incomplete lifecycle */}
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
                            {activeCard?.label || t('main_tech.dashboard.list_title')}
                        </h2>
                        <span className={`badge font-medium px-3 py-1 ${activeColor.badge}`}>
                            {complaints.length}
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('table.report_number')}</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('table.original_technician', 'Juruteknik Asal')}</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin_complaint_detail.transport_note', 'Catatan Pengangkutan')}</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin_complaint_detail.checking', 'Pemeriksaan')}</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('table.incomplete_reason', 'Sebab Bawa Pulang')}</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('table.action')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            <div className="flex justify-center items-center gap-3">
                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent"></div>
                                                {t('common.loading')}
                                            </div>
                                        </td>
                                    </tr>
                                ) : complaints.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-400">
                                                <AlertTriangle className="w-12 h-12 mb-3 text-gray-300" />
                                                <p className="text-lg font-medium text-gray-600">{t('main_tech.dashboard.empty')}</p>
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
                                                    <div className="font-medium text-gray-900">{complaint.report_number || `ADU-${complaint.id}`}</div>
                                                    <div className="text-xs text-gray-500 mt-1">{formatDate(complaint.created_at)}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                                        {isAssignedTo}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm text-gray-600 line-clamp-2" title={details.transport}>
                                                        {details.transport}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm text-gray-600 line-clamp-2" title={details.checking}>
                                                        {details.checking}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm text-gray-600 line-clamp-2" title={details.remark}>
                                                        {details.remark}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    {!complaint.assigned_to ? (
                                                        <button
                                                            onClick={() => setSelectedComplaint(complaint)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded transition-colors shadow-sm"
                                                        >
                                                            <ArrowRightCircle className="w-3.5 h-3.5" />
                                                            Forward Job
                                                        </button>
                                                    ) : (
                                                        <Link
                                                            to={`/main-tech/complaint/${complaint.report_number}`}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-medium rounded transition-colors shadow-sm"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            {t('common.view', 'Papar')}
                                                        </Link>
                                                    )}
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

            {selectedComplaint && (
                <ForwardJobModal
                    complaint={selectedComplaint}
                    onClose={() => setSelectedComplaint(null)}
                    onSuccess={handleForwardSuccess}
                />
            )}
        </MainTechLayout>
    );
}
