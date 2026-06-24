import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Wrench, Search, AlertTriangle, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import { Complaint } from '../../types';
import toast from 'react-hot-toast';

export default function AdminMainTechQueue() {
    const { t } = useTranslation();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadComplaints();
    }, []);

    const loadComplaints = async () => {
        try {
            // Fetch all complaints, filter for incomplete
            const response = await api.get('/complaints?status=incomplete');
            setComplaints(response.data.data || response.data || []);
        } catch (error) {
            toast.error('Gagal memuatkan senarai Bawa Pulang');
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
        // Find the remark that caused the incomplete status
        const incompleteRemark = sorted.find(r => r.status === 'incomplete') || sorted[0];
        
        return {
            remark: incompleteRemark.remark || '-',
            transport: incompleteRemark.note_transport || '-'
        };
    };

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Senarai Bawa Pulang (Incomplete)</h1>
                            <p className="text-gray-500 mt-1">Pantauan senarai mesin yang tidak dapat dibaiki di rumah pelanggan</p>
                        </div>
                    </div>
                </div>

                <div className="card overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800">Senarai Menunggu Tindakan Main Technician</h2>
                        <span className="badge bg-orange-100 text-orange-700 font-medium px-3 py-1">
                            {complaints.length} Mesin
                        </span>
                    </div>

                    <div className="overflow-x-auto">
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
                                                <p className="text-lg font-medium text-gray-600">Tiada mesin dibawa pulang</p>
                                                <p className="text-sm mt-1">Semua aduan dalam keadaan terkawal.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    complaints.map((complaint) => {
                                        const details = getIncompleteDetails(complaint);
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
                                                    <div className="text-sm font-medium text-gray-900">{complaint.customer?.name || '-'}</div>
                                                    <div className="text-xs text-gray-500 mt-1 max-w-[200px] truncate" title={complaint.customer?.address}>
                                                        {complaint.customer?.address || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                                        {complaint.technicians?.name || 'Tidak Diketahui'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm text-gray-600 line-clamp-2" title={details.remark}>
                                                        {details.remark}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm font-medium text-gray-700">{details.transport}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <Link
                                                        to={`/admin/complaint/${complaint.id}`}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors"
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
        </AdminLayout>
    );
}
