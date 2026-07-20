import { useEffect, useState, useCallback } from 'react';
import { Wrench, AlertCircle, Clock, UserCheck, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import MainTechLayout from '../../components/MainTechLayout';
import api from '../../services/api';
import { Complaint, DashboardStats } from '../../types';
import { useTranslation } from 'react-i18next';

export default function MainTechDashboard() {
    const { t } = useTranslation();
    const [stats, setStats] = useState<DashboardStats>({
        total: 0, pending: 0, in_process: 0, closed: 0, not_forwarded: 0, assigned: 0,
        cancelled: 0, incomplete: 0,
        incomplete_total: 0, incomplete_not_assigned: 0, incomplete_assigned: 0, incomplete_completed: 0,
    });
    const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
    const [isLoadingRecent, setIsLoadingRecent] = useState(true);

    const loadStats = useCallback(async () => {
        try {
            const res = await api.get('/admin/stats');
            setStats(res.data.stats);
        } catch (error) {
            console.error('Failed to load stats', error);
        }
    }, []);

    const loadRecent = useCallback(async () => {
        setIsLoadingRecent(true);
        try {
            const res = await api.get('/complaints?status=incomplete&limit=5');
            setRecentComplaints(res.data.complaints || res.data.data || []);
        } catch (error) {
            console.error('Failed to load recent complaints', error);
        } finally {
            setIsLoadingRecent(false);
        }
    }, []);

    useEffect(() => {
        loadStats();
        loadRecent();
    }, [loadStats, loadRecent]);

    // Incomplete lifecycle cards. Each maps to a backend status filter.
    const statCards = [
        { label: t('main_tech.dashboard.cards.incomplete'), value: stats.incomplete_total, icon: AlertCircle, color: 'orange', filter: 'incomplete' },
        { label: t('main_tech.dashboard.cards.not_forwarded'), value: stats.incomplete_not_assigned, icon: Clock, color: 'red', filter: 'incomplete_not_assigned' },
        { label: t('main_tech.dashboard.cards.assigned'), value: stats.incomplete_assigned, icon: UserCheck, color: 'teal', filter: 'incomplete_assigned' },
        { label: t('main_tech.dashboard.cards.closed'), value: stats.incomplete_completed, icon: CheckCircle, color: 'green', filter: 'incomplete_completed' },
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
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6">
                    {statCards.map((card) => {
                        const Icon = card.icon;
                        const colors = getColorClasses(card.color);
                        return (
                            <Link
                                key={card.label}
                                to={`/main-tech/complaints?status=${card.filter}`}
                                className={`bg-white rounded-xl shadow-sm border-l-4 p-3 sm:p-5 ${colors.border} hover:shadow-lg transition-shadow cursor-pointer flex flex-col justify-between`}
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
                <div className="card overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800">
                            {t('main_tech.dashboard.recent_complaints', 'Aduan Terkini (Bawa Pulang)')}
                        </h2>
                        <Link
                            to="/main-tech/complaints"
                            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                        >
                            {t('common.view_all', 'Lihat Semua')} →
                        </Link>
                    </div>

                    <div className="overflow-hidden sm:rounded-lg">
                        {/* Mobile Layout (List-Item Compact) */}
                        <div className="block md:hidden border-t border-gray-200">
                            {isLoadingRecent ? (
                                <div className="p-8 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-3">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent"></div>
                                        Loading...
                                    </div>
                                </div>
                            ) : recentComplaints.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    Tiada aduan terkini
                                </div>
                            ) : (
                                recentComplaints.map((complaint) => (
                                    <div key={complaint.id} className="bg-white border-b border-gray-200 p-4 last:border-b-0 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-bold text-gray-900 text-sm">
                                                {complaint.report_number || `ADU-${complaint.id}`}
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm items-start mb-3">
                                            <span className="text-gray-500 text-[11px] uppercase tracking-wider mt-0.5">{t('admin_complaint_detail.date_created', 'Tarikh Dicipta')}</span>
                                            <span className="text-gray-600 text-xs">
                                                {new Date(complaint.created_at).toLocaleDateString('ms-MY', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </span>

                                            <span className="text-gray-500 text-[11px] uppercase tracking-wider mt-0.5">{t('table.original_technician', 'Juruteknik')}</span>
                                            <div>
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
                                                    {complaint.technicians?.name || complaint.assigned_to || 'Tidak Diketahui'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-3 border-t border-gray-100 pt-3">
                                            <Link
                                                to={`/main-tech/complaint/${complaint.report_number}`}
                                                className="w-full inline-flex justify-center items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-medium rounded-lg transition-colors border border-indigo-100"
                                            >
                                                Papar
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Desktop Layout (Table) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('admin_users.report_no', 'No. Laporan')}</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('admin_complaint_detail.date_created', 'Tarikh Dicipta')}</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('table.original_technician', 'Juruteknik')}</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('common_actions.action', 'Tindakan')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {isLoadingRecent ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                                <div className="flex justify-center items-center gap-3">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent"></div>
                                                    Loading...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : recentComplaints.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                                Tiada aduan terkini
                                            </td>
                                        </tr>
                                    ) : (
                                    recentComplaints.map(complaint => (
                                        <tr key={complaint.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                                {complaint.report_number || `ADU-${complaint.id}`}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(complaint.created_at).toLocaleDateString('ms-MY', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                                    {complaint.technicians?.name || complaint.assigned_to || 'Tidak Diketahui'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <Link
                                                    to={`/main-tech/complaint/${complaint.report_number}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-medium rounded transition-colors shadow-sm"
                                                >
                                                    Papar
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </div>
            </div>
        </MainTechLayout>
    );
}
