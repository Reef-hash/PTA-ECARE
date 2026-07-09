import { useEffect, useState, useCallback } from 'react';
import { Wrench, AlertCircle, Clock, UserCheck, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import MainTechLayout from '../../components/MainTechLayout';
import api from '../../services/api';
import { DashboardStats } from '../../types';
import { useTranslation } from 'react-i18next';

export default function MainTechDashboard() {
    const { t } = useTranslation();
    const [stats, setStats] = useState<DashboardStats>({
        total: 0, pending: 0, in_process: 0, closed: 0, not_forwarded: 0, assigned: 0,
        cancelled: 0, incomplete: 0,
        incomplete_total: 0, incomplete_not_assigned: 0, incomplete_assigned: 0, incomplete_completed: 0,
    });

    const loadStats = useCallback(async () => {
        try {
            const res = await api.get('/admin/stats');
            setStats(res.data.stats);
        } catch (error) {
            console.error('Failed to load stats', error);
        }
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

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
            </div>
        </MainTechLayout>
    );
}
