import { useEffect, useState } from 'react';
import { Wrench, AlertTriangle, ArrowRightCircle, AlertCircle, Clock, UserCheck, CheckCircle } from 'lucide-react';
import MainTechLayout from '../../components/MainTechLayout';
import api from '../../services/api';
import { Complaint, DashboardStats } from '../../types';
import toast from 'react-hot-toast';
import ForwardJobModal from './ForwardJobModal';

export default function MainTechDashboard() {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        total: 0, pending: 0, in_process: 0, closed: 0, not_forwarded: 0, assigned: 0, cancelled: 0, incomplete: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [complaintsRes, statsRes] = await Promise.all([
                api.get('/complaints?status=incomplete'),
                api.get('/admin/stats')
            ]);
            setComplaints(complaintsRes.data.complaints || complaintsRes.data.data || []);
            setStats(statsRes.data.stats);
        } catch (error) {
            toast.error('Gagal memuatkan data papan pemuka');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ms-MY', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Helper to extract the latest remark and transport details
    const getIncompleteDetails = (complaint: Complaint) => {
        if (!complaint.remarks || complaint.remarks.length === 0) return { remark: '-', transport: '-' };
        const sorted = [...complaint.remarks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const incompleteRemark = sorted.find(r => r.status === 'incomplete') || sorted[0];
        
        return {
            remark: incompleteRemark.remark || '-',
            transport: incompleteRemark.note_transport || '-'
        };
    };

    const handleForwardSuccess = () => {
        setSelectedComplaint(null);
        loadDashboardData(); // reload the list
    };

    const statCards = [
        { label: 'Mesin Bawa Pulang', value: stats.incomplete, icon: AlertCircle, color: 'orange' },
        { label: 'Belum Diagih', value: stats.not_forwarded, icon: Clock, color: 'red' },
        { label: 'Telah Diagih', value: stats.assigned, icon: UserCheck, color: 'teal' },
        { label: 'Selesai', value: stats.closed, icon: CheckCircle, color: 'green' },
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
        <MainTechLayout breadcrumb="Dashboard">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Wrench className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Pengurusan Mesin Bawa Pulang</h1>
                            <p className="text-gray-500 mt-1">Senarai aduan yang perlu diagihkan kepada juruteknik kedai</p>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {statCards.map((card) => {
                        const Icon = card.icon;
                        const colors = getColorClasses(card.color);
                        return (
                            <div
                                key={card.label}
                                className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${colors.border} border-l-4`}
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
                            </div>
                        );
                    })}
                </div>

                <div className="card overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800">Senarai Menunggu Agihan</h2>
                        <span className="badge bg-orange-100 text-orange-700 font-medium px-3 py-1">
                            {complaints.length} Mesin
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Laporan</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Juruteknik Asal</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sebab Bawa Pulang</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Tindakan</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                            <div className="flex justify-center items-center gap-3">
                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent"></div>
                                                Memuatkan data...
                                            </div>
                                        </td>
                                    </tr>
                                ) : complaints.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-400">
                                                <AlertTriangle className="w-12 h-12 mb-3 text-gray-300" />
                                                <p className="text-lg font-medium text-gray-600">Tiada tugas tertunggak</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    complaints.map((complaint) => {
                                        const details = getIncompleteDetails(complaint);
                                        return (
                                            <tr key={complaint.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900">{complaint.report_number || `ADU-${complaint.id}`}</div>
                                                    <div className="text-xs text-gray-500 mt-1">{formatDate(complaint.created_at)}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                                        {complaint.technicians?.name || 'Tidak Diketahui'}
                                                    </span>
                                                    <div className="text-xs text-gray-500 mt-1">Jarak: {details.transport}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm text-gray-600 line-clamp-2" title={details.remark}>
                                                        {details.remark}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <button
                                                        onClick={() => setSelectedComplaint(complaint)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded transition-colors shadow-sm"
                                                    >
                                                        <ArrowRightCircle className="w-3.5 h-3.5" />
                                                        Forward Job
                                                    </button>
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
