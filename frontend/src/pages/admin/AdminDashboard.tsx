import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, AlertTriangle, Forward, CheckCircle, Users, XCircle, UserCheck, PackageOpen } from 'lucide-react';import AdminLayout from '../../components/AdminLayout';
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
        incomplete: 0,
        incomplete_total: 0, incomplete_not_assigned: 0, incomplete_assigned: 0, incomplete_completed: 0,
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
        { label: t('dashboard.total_complaints'), value: stats.total, icon: FileText, color: 'purple', path: '/admin/all-complaints' },
        { label: t('dashboard.not_processed'), value: stats.pending, icon: Clock, color: 'orange', path: '/admin/not-processed' },
        { label: t('dashboard.in_progress'), value: stats.in_process, icon: AlertTriangle, color: 'green', path: '/admin/in-progress' },
        { label: t('dashboard.not_forwarded'), value: stats.not_forwarded, icon: Forward, color: 'red', path: '/admin/not-forwarded' },
        { label: t('dashboard.job_assigned'), value: stats.assigned, icon: UserCheck, color: 'blue', path: '/admin/job-assigned' },
        { label: t('dashboard.completed'), value: stats.closed, icon: CheckCircle, color: 'gray', path: '/admin/closed' },
        { label: t('dashboard.cancelled'), value: stats.cancelled, icon: XCircle, color: 'red', path: '/admin/cancelled' },
        { label: t('dashboard.incomplete'), value: stats.incomplete, icon: PackageOpen, color: 'yellow', path: '/admin/incomplete-bawa-pulang' },
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
            amber: { bg: 'bg-amber-100', icon: 'text-amber-600', border: 'border-l-amber-500' },
            gray: { bg: 'bg-gray-100', icon: 'text-gray-600', border: 'border-l-gray-500' },
        };
        return colors[color] || colors.blue;
    };

    return (
        <AdminLayout title="Dashboard" breadcrumb="Dashboard">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-8">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    const colors = getColorClasses(card.color);
                    return (
                        <Link
                            key={card.label}
                            to={card.path}
                            className={`bg-white rounded-xl shadow-sm border-l-4 p-3 sm:p-5 ${colors.border} hover:shadow-lg transition-shadow flex flex-col justify-between`}
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

            {/* Technician Stats */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Technician
                    </h2>
                </div>

                {technicianStats.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">{t('dashboard.no_technicians')}</p>
                ) : (
                    <div className="overflow-hidden sm:rounded-lg">
                        {/* Mobile Layout (Premium Card View) */}
                        <div className="block md:hidden border-t border-gray-200 bg-gray-50/50">
                            {technicianStats.map((tech, index) => (
                                <div key={tech.technician_id} className="bg-white border-b border-gray-200 p-5 last:border-b-0 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3 min-w-0 pr-3">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm shrink-0">
                                                {index + 1}
                                            </div>
                                            <div className="min-w-0">
                                                <Link
                                                    to={`/admin/technicians/${tech.technician_id}`}
                                                    className="text-gray-900 hover:text-indigo-600 font-bold text-base transition-colors truncate block"
                                                >
                                                    {tech.technician_name}
                                                </Link>
                                                <span className="text-gray-500 text-xs font-medium uppercase tracking-wider truncate block">{tech.department}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5 text-right whitespace-nowrap">Total Job<br/>Assigned</span>
                                            <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm mt-1">
                                                {tech.total}
                                            </span>
                                        </div>
                                    </div>
                                    

                                </div>
                            ))}
                        </div>

                        {/* Desktop Layout (Table) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="table-header">
                                        <th className="text-left px-4 py-3 whitespace-nowrap">#</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('common.name')}</th>
                                        <th className="text-left px-4 py-3 whitespace-nowrap">{t('common.department')}</th>
                                        <th className="text-center px-4 py-3 whitespace-nowrap">Total Job Assigned</th>
                                        <th className="text-center px-4 py-3 whitespace-nowrap">{t('admin_users.status_pending')}</th>
                                        <th className="text-center px-4 py-3 whitespace-nowrap">{t('admin_users.status_in_process')}</th>
                                        <th className="text-center px-4 py-3 whitespace-nowrap">{t('admin_users.status_incomplete')}</th>
                                        <th className="text-center px-4 py-3 whitespace-nowrap">{t('admin_users.status_closed')}</th>
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
                                                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                                                    {tech.incomplete}
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
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
