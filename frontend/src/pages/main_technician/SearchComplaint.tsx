import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, AlertCircle, User } from 'lucide-react';
import MainTechLayout from '../../components/MainTechLayout';
import api from '../../services/api';
import { Complaint } from '../../types';
import toast from 'react-hot-toast';

export default function SearchComplaint() {
    const { t } = useTranslation();
    const [icNumber, setIcNumber] = useState('');
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!icNumber.trim()) {
            toast.error('Sila masukkan No. Kad Pengenalan');
            return;
        }

        setIsLoading(true);
        setHasSearched(true);
        
        try {
            // Find complaints by customer IC
            // the endpoint could be /complaints?search=...
            const response = await api.get(`/complaints?search=${icNumber.trim()}`);
            const fetchedComplaints = response.data.complaints || response.data.data || [];
            setComplaints(fetchedComplaints);
            
            if (fetchedComplaints.length === 0) {
                toast.error('Tiada rekod aduan dijumpai untuk No. IC ini');
            }
        } catch (error) {
            toast.error('Gagal membuat carian');
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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="badge bg-yellow-100 text-yellow-700 border-yellow-200">{t('admin_users.status_pending') || 'Pending'}</span>;
            case 'in_process':
                return <span className="badge bg-blue-100 text-blue-700 border-blue-200">{t('admin_users.status_in_process') || 'In Process'}</span>;
            case 'incomplete':
                return <span className="badge bg-orange-100 text-orange-700 border-orange-200">Incomplete / Bawa Pulang</span>;
            case 'ready_pickup':
                return <span className="badge bg-indigo-100 text-indigo-700 border-indigo-200">Sedia Diambil</span>;
            case 'closed':
                return <span className="badge bg-green-100 text-green-700 border-green-200">{t('admin_users.status_closed') || 'Closed'}</span>;
            case 'cancelled':
                return <span className="badge bg-red-100 text-red-700 border-red-200">{t('admin_users.status_cancelled') || 'Cancelled'}</span>;
            default:
                return <span className="badge bg-gray-100 text-gray-700 border-gray-200">{status}</span>;
        }
    };

    return (
        <MainTechLayout>
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                            <Search className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Semak Rekod Aduan</h1>
                            <p className="text-gray-500 mt-1">Cari maklumat aduan pelanggan menggunakan No. Kad Pengenalan</p>
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className="flex gap-3">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={icNumber}
                                onChange={(e) => setIcNumber(e.target.value)}
                                placeholder="Contoh: 900101011234"
                                className="input-field pl-11 w-full"
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={isLoading || !icNumber.trim()}
                            className="btn-primary flex items-center gap-2 whitespace-nowrap"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Search className="w-5 h-5" />
                                    Semak
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {hasSearched && (
                    <div className="card overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-800">Hasil Carian</h2>
                            <span className="text-sm font-medium text-gray-500">
                                {complaints.length} rekod dijumpai
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">No. Laporan</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Maklumat Barangan</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tarikh Aduan</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status Terkini</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {complaints.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-400">
                                                    <AlertCircle className="w-12 h-12 mb-3 text-gray-300" />
                                                    <p className="text-lg font-medium text-gray-600">Tiada Rekod Dijumpai</p>
                                                    <p className="text-sm mt-1">Sila pastikan nombor kad pengenalan dimasukkan dengan betul.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        complaints.map((complaint) => (
                                            <tr key={complaint.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900">{complaint.report_number || `ADU-${complaint.id}`}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-gray-900">{complaint.brand_name || complaint.custom_brand} {complaint.model}</div>
                                                    <div className="text-xs text-gray-500 mt-1 line-clamp-1">{complaint.subcategory || complaint.category_name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-600">{formatDate(complaint.created_at)}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(complaint.status)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </MainTechLayout>
    );
}
