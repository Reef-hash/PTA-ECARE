import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, AlertTriangle, Forward, CheckCircle, Users, XCircle, UserCheck } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import { DashboardStats, TechnicianStats } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function AdminDashboard() {
    const { t } = useTranslation();
    const [stats, setStats] = useState<DashboardStats>({
        total: 0,
        pending: 0,
        in_process: 0,
        closed: 0,
        not_forwarded: 0,
        assigned: 0,
        cancelled: 0,
    });
    const [technicianStats, setTechnicianStats] = useState<TechnicianStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const [statsRes, techRes] = await Promise.all([
                api.get('/admin/stats'),
                api.get('/admin/technician-stats'),
            ]);
            setStats(statsRes.data.stats);
            setTechnicianStats(techRes.data.technicianStats);
        } catch (error) {
            toast.error('Gagal memuatkan data');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <AdminLayout title="Dashboard" breadcrumb="Dashboard">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                </div>
            </AdminLayout>
        );
    }

    const statCards = [
        { label: t('dashboard.total_complaints'), value: stats.total, icon: FileText, color: 'blue', path: '/admin/all-complaints' },
        { label: t('dashboard.not_processed'), value: stats.pending, icon: Clock, color: 'yellow', path: '/admin/not-processed' },
        { label: t('dashboard.in_progress'), value: stats.in_process, icon: AlertTriangle, color: 'orange', path: '/admin/in-progress' },
        { label: t('dashboard.not_forwarded'), value: stats.not_forwarded, icon: Forward, color: 'red', path: '/admin/not-forwarded' },
        { label: t('dashboard.job_assigned'), value: stats.assigned, icon: UserCheck, color: 'teal', path: '/admin/job-assigned' },
        { label: t('dashboard.completed'), value: stats.closed, icon: CheckCircle, color: 'green', path: '/admin/closed' },
        { label: t('dashboard.cancelled'), value: stats.cancelled, icon: XCircle, color: 'purple', path: '/admin/cancelled' },
    ];

    const getColorClasses = (color: string) => {
        const colors: Record<string, { bg: string; icon: string; border: string }> = {
            blue: { bg: 'bg-blue-100', icon: 'text-blue-600', border: 'border-l-blue-500' },
            yellow: { bg: 'bg-yellow-100', icon: 'text-yellow-600', border: 'border-l-yellow-500' },
            orange: { bg: 'bg-orange-100', icon: 'text-orange-600', border: 'border-l-orange-500' },
            red: { bg: 'bg-red-100', icon: 'text-red-600', border: 'border-l-red-500' },
            green: { bg: 'bg-green-100', icon: 'text-green-600', border: 'border-l-green-500' },
            teal: { bg: 'bg-teal-100', icon: 'text-teal-600', border: 'border-l-teal-500' },
            purple: { bg: 'bg-purple-100', icon: 'text-purple-600', border: 'border-l-purple-500' },
        };
        return colors[color] || colors.blue;
    };

    return (
        <AdminLayout title="Dashboard" breadcrumb="Dashboard">
            {/* Stats Grid */}
            <div className="flex overflow-x-auto pb-4 gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-7 mb-8 sm:pb-0 remove-scrolling">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    const colors = getColorClasses(card.color);
                    return (
                        <Link
                            key={card.label}
                            to={card.path}
                            className={`stat-card flex-shrink-0 w-[calc(100vw-4rem)] sm:w-auto ${colors.border} hover:shadow-lg transition-shadow`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-xs uppercase font-medium">{card.label}</p>
                                    <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
                                </div>
                                <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
                                    <Icon className={`w-5 h-5 ${colors.icon}`} />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Technician Stats */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        {t('dashboard.technician_stats')}
                    </h2>
                </div>

                {technicianStats.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">{t('dashboard.no_technicians')}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="table-header">
                                    <th className="text-left px-4 py-3 whitespace-nowrap">#</th>
                                    <th className="text-left px-4 py-3 whitespace-nowrap">{t('table.name')}</th>
                                    <th className="text-left px-4 py-3 whitespace-nowrap">{t('table.department')}</th>
                                    <th className="text-center px-4 py-3 whitespace-nowrap">{t('table.total')}</th>
                                    <th className="text-center px-4 py-3 whitespace-nowrap">{t('table.pending')}</th>
                                    <th className="text-center px-4 py-3 whitespace-nowrap">{t('table.in_process')}</th>
                                    <th className="text-center px-4 py-3 whitespace-nowrap">{t('table.closed')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {technicianStats.map((tech, index) => (
                                    <tr key={tech.technician_id} className="table-row">
                                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{index + 1}</td>
                                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                                            <Link
                                                to={`/admin/technicians/${tech.technician_id}`}
                                                className="text-indigo-600 hover:text-indigo-800 hover:underline"
                                            >
                                                {tech.technician_name}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{tech.department}</td>
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                                {tech.total}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                                                {tech.pending}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                                                {tech.in_process}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                                {tech.closed}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
