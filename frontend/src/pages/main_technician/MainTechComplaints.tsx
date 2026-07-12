import { useEffect, useState, useCallback } from 'react';
import { Wrench, AlertTriangle, ArrowRightCircle, Eye } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import MainTechLayout from '../../components/MainTechLayout';
import api from '../../services/api';
import { Complaint } from '../../types';
import toast from 'react-hot-toast';
import ForwardJobModal from './ForwardJobModal';
import { useTranslation } from 'react-i18next';

export default function MainTechComplaints() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const activeFilter = searchParams.get('status') || 'incomplete';

    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

    const loadComplaints = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`/complaints?status=${activeFilter}&limit=1000`);
            setComplaints(response.data.complaints || response.data.data || []);
        } catch (error) {
            toast.error(t('common.error_load') || 'Gagal memuatkan data');
        } finally {
            setIsLoading(false);
        }
    }, [activeFilter, t]);

    useEffect(() => {
        loadComplaints();
    }, [loadComplaints]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ms-MY', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getIncompleteDetails = (complaint: Complaint) => {
        if (!complaint.remarks || complaint.remarks.length === 0) return { remark: '-', transport: '-', checking: '-' };
        const sorted = [...complaint.remarks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const incompleteRemark = sorted.find(r => r.status === 'incomplete' && !r.remark?.includes('__FORWARD__')) 
            || sorted.find(r => r.status === 'incomplete') 
            || sorted[0];

        const rawRemark = incompleteRemark.remark || '-';
        const displayRemark = rawRemark.includes('__FORWARD__') ? rawRemark.split('__FORWARD__')[0].trim() || '-' : rawRemark;

        return {
            remark: displayRemark,
            transport: incompleteRemark.note_transport || '-',
            checking: incompleteRemark.checking || '-'
        };
    };

    const handleForwardSuccess = useCallback(() => {
        setSelectedComplaint(null);
        loadComplaints();
    }, [loadComplaints]);

    const getTitle = () => {
        switch(activeFilter) {
            case 'incomplete': return t('main_tech.dashboard.cards.incomplete');
            case 'incomplete_not_assigned': return t('main_tech.dashboard.cards.not_forwarded');
            case 'incomplete_assigned': return t('main_tech.dashboard.cards.assigned');
            case 'incomplete_completed': return t('main_tech.dashboard.cards.closed');
            default: return t('main_tech.dashboard.list_title');
        }
    };

    return (
        <MainTechLayout breadcrumb={getTitle()}>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Wrench className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{getTitle()}</h1>
                            <p className="text-gray-500 mt-1">Senarai aduan untuk kategori ini</p>
                        </div>
                    </div>
                </div>

                <div className="card overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800">
                            {getTitle()}
                        </h2>
                        <span className="badge font-medium px-3 py-1 bg-indigo-100 text-indigo-700">
                            {complaints.length}
                        </span>
                    </div>

                    <div className="overflow-hidden sm:rounded-lg">
                        {/* Mobile Layout (List-Item Compact) */}
                        <div className="block md:hidden border-t border-gray-200">
                            {isLoading ? (
                                <div className="p-8 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-3">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent"></div>
                                        {t('common.loading')}
                                    </div>
                                </div>
                            ) : complaints.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                        <AlertTriangle className="w-12 h-12 mb-3 text-gray-300" />
                                        <p className="text-lg font-medium text-gray-600">{t('main_tech.dashboard.empty')}</p>
                                    </div>
                                </div>
                            ) : (
                                complaints.map((complaint) => {
                                    const details = getIncompleteDetails(complaint);
                                    const isAssignedTo = complaint.technicians?.name || complaint.assigned_to || 'Tidak Diketahui';

                                    return (
                                        <div key={complaint.id} className="bg-white border-b border-gray-200 p-4 last:border-b-0 hover:bg-gray-50 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="font-medium text-gray-900">{complaint.report_number || `ADU-${complaint.id}`}</div>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm mt-3 items-center">
                                                <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('admin_complaint_detail.date_created', 'Tarikh Dicipta')}</span>
                                                <span className="text-gray-900 text-xs">{formatDate(complaint.created_at)}</span>

                                                <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('table.original_technician', 'Juruteknik Asal')}</span>
                                                <div>
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
                                                        {isAssignedTo}
                                                    </span>
                                                </div>

                                                <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('admin_complaint_detail.defect_details', 'Butiran Kerosakan')}</span>
                                                <span className="text-gray-900 text-xs line-clamp-2">{complaint.details || '-'}</span>

                                                <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('admin_complaint_detail.transport_note', 'Catatan Transport')}</span>
                                                <span className="text-gray-600 text-xs line-clamp-1">{details.transport}</span>

                                                <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('admin_complaint_detail.checking', 'Pemeriksaan')}</span>
                                                <span className="text-gray-600 text-xs line-clamp-1">{details.checking}</span>

                                                <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('table.incomplete_reason', 'Sebab')}</span>
                                                <span className="text-gray-900 text-xs line-clamp-2">{details.remark}</span>
                                            </div>
                                            
                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                {!complaint.assigned_to ? (
                                                    <button
                                                        onClick={() => setSelectedComplaint(complaint)}
                                                        className="w-full inline-flex justify-center items-center gap-1.5 px-3 py-2 bg-primary-50 text-primary-700 hover:bg-primary-100 text-xs font-medium rounded-lg transition-colors border border-primary-100"
                                                    >
                                                        <ArrowRightCircle className="w-4 h-4" />
                                                        Forward Job
                                                    </button>
                                                ) : (
                                                    <Link
                                                        to={`/main-tech/complaint/${complaint.report_number}`}
                                                        className="w-full inline-flex justify-center items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-medium rounded-lg transition-colors border border-indigo-100"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        {t('common.view', 'View Details')}
                                                    </Link>
                                                )}
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
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[140px]">{t('admin_users.report_no')}</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[140px]">{t('admin_complaint_detail.date_created', 'Tarikh Dicipta')}</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[150px]">{t('table.original_technician', 'Juruteknik Asal')}</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">{t('admin_complaint_detail.defect_details', 'Butiran Kerosakan')}</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">{t('admin_complaint_detail.transport_note', 'Catatan Pengangkutan')}</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">{t('admin_complaint_detail.checking', 'Pemeriksaan')}</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">{t('table.incomplete_reason', 'Sebab Bawa Pulang')}</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[100px]">{t('common_actions.action')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                                <div className="flex justify-center items-center gap-3">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent"></div>
                                                    {t('common.loading')}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : complaints.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center">
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
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatDate(complaint.created_at)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                                            {isAssignedTo}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm text-gray-600 line-clamp-2" title={complaint.details}>
                                                            {complaint.details || '-'}
                                                        </p>
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
