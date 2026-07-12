import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Mail, Phone, Building, Search, Eye, Edit, MapPin } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import { Technician, Complaint } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function TechnicianDetail() {
    const { t } = useTranslation();
    const { id } = useParams();
    const [technician, setTechnician] = useState<Technician | null>(null);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'in_process' | 'incomplete' | 'closed'>('pending');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Fetch technician details
            const techRes = await api.get(`/admin/technicians/${id}`);

            // Fetch complaints assigned to this technician
            // Note: Filters will be applied client-side or we can add query params if list is huge.
            // For now, fetching all assigned to this tech and filtering client based on status
            const complaintsRes = await api.get(`/complaints?assigned_to=${id}&limit=100`); // Fetch recent 100 or all?

            setTechnician(techRes.data.technician);
            setComplaints(complaintsRes.data.complaints);
        } catch (error) {
            toast.error(t('common.error_load'));
        } finally {
            setIsLoading(false);
        }
    };

    const pendingComplaints = complaints.filter(c => c.status === 'pending');
    const inProcessComplaints = complaints.filter(c => c.status === 'in_process');
    const incompleteComplaints = complaints.filter(c => c.status === 'incomplete');
    const closedComplaints = complaints.filter(c => c.status === 'closed');

    const filteredList = complaints.filter(c => c.status === activeTab).filter(c =>
        c.report_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.brand_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <span className="badge badge-pending">{t('admin_users.status_pending')}</span>;
            case 'in_process': return <span className="badge badge-in-process">{t('admin_users.status_in_process')}</span>;
            case 'incomplete':
                return <span className="badge badge-incomplete">{t('admin_users.status_incomplete')}</span>;
            case 'bawa_pulang':
                return <span className="badge badge-incomplete">{t('admin_users.status_bawa_pulang')}</span>;
            case 'ready_pickup':
                return <span className="badge bg-indigo-100 text-indigo-700 border-indigo-200">Ready Pickup</span>;
            case 'closed': return <span className="badge badge-closed">{t('admin_users.status_closed')}</span>;
            default: return null;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ms-MY', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <AdminLayout title="Technician Details" breadcrumb={t('admin_technicians.title')}>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                </div>
            </AdminLayout>
        );
    }

    if (!technician) {
        return (
            <AdminLayout title="Technician Details" breadcrumb={t('admin_technicians.title')}>
                <div className="text-center py-12">
                    <p className="text-gray-500">Technician not found</p>
                    <Link to="/admin/technicians" className="btn-secondary mt-4 inline-block">
                        {t('common_actions.back_to_list')}
                    </Link>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title={technician.name} breadcrumb={t('admin_technicians.title')}>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header / Back & Edit */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-800">{t('admin_technicians.title')}</h1>
                    <Link
                        to={`/admin/technicians/edit/${id}`}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Edit className="w-4 h-4" />
                        Edit
                    </Link>
                </div>

                {/* Technician Info Card */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md">
                            {technician.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">{technician.name}</h2>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${technician.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {technician.is_active ? t('admin_users.active') : t('admin_users.inactive')}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-gray-400" />
                            <span>{technician.department}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>{technician.email || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{technician.contact_number}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-400">ID:</span>
                            <span>{technician.username}</span>
                        </div>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Pending */}
                    <div className={`p-4 rounded-xl border-l-4 shadow-sm bg-white ${activeTab === 'pending' ? 'border-yellow-500 ring-2 ring-yellow-500/20' : 'border-gray-200'} cursor-pointer transition-all`}
                        onClick={() => setActiveTab('pending')}>
                        <p className="text-sm font-medium text-gray-500">{t('admin_users.status_pending')}</p>
                        <p className="text-3xl font-bold text-gray-800 mt-1">{pendingComplaints.length}</p>
                        <p className="text-xs text-yellow-500 mt-1 font-medium">Pending</p>
                    </div>
                    {/* In Process */}
                    <div className={`p-4 rounded-xl border-l-4 shadow-sm bg-white ${activeTab === 'in_process' ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-gray-200'} cursor-pointer transition-all`}
                        onClick={() => setActiveTab('in_process')}>
                        <p className="text-sm font-medium text-gray-500">{t('admin_users.status_in_process')}</p>
                        <p className="text-3xl font-bold text-gray-800 mt-1">{inProcessComplaints.length}</p>
                        <p className="text-xs text-orange-500 mt-1 font-medium">In Process</p>
                    </div>
                    {/* Incomplete */}
                    <div className={`p-4 rounded-xl border-l-4 shadow-sm bg-white ${activeTab === 'incomplete' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-200'} cursor-pointer transition-all`}
                        onClick={() => setActiveTab('incomplete')}>
                        <p className="text-sm font-medium text-gray-500">{t('admin_users.status_incomplete')}</p>
                        <p className="text-3xl font-bold text-gray-800 mt-1">{incompleteComplaints.length}</p>
                        <p className="text-xs text-red-500 mt-1 font-medium">Incomplete</p>
                    </div>
                    {/* Closed */}
                    <div className={`p-4 rounded-xl border-l-4 shadow-sm bg-white ${activeTab === 'closed' ? 'border-green-500 ring-2 ring-green-500/20' : 'border-gray-200'} cursor-pointer transition-all`}
                        onClick={() => setActiveTab('closed')}>
                        <p className="text-sm font-medium text-gray-500">{t('admin_users.status_closed')}</p>
                        <p className="text-3xl font-bold text-gray-800 mt-1">{closedComplaints.length}</p>
                        <p className="text-xs text-green-500 mt-1 font-medium">Closed</p>
                    </div>
                </div>

                {/* Task List */}
                <div className="card">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-800 uppercase">
                            {activeTab.replace('_', ' ')} Complaints
                        </h3>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('technician_dashboard.search_placeholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-field pl-9 py-2 text-sm"
                            />
                        </div>
                    </div>

                    {filteredList.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">{t('admin_master.no_data')}</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="table-header text-xs uppercase">
                                            <th className="px-4 py-3 text-left whitespace-nowrap">{t('admin_users.report_no')}</th>
                                            <th className="px-4 py-3 text-left whitespace-nowrap">{t('admin_users.customer')}</th>
                                            <th className="px-4 py-3 text-left whitespace-nowrap">{t('admin_master.brand')}</th>
                                            <th className="px-4 py-3 text-left whitespace-nowrap">{t('admin_master.subcategory')}</th>
                                            <th className="px-4 py-3 text-center whitespace-nowrap">{t('common_actions.status')}</th>
                                            <th className="px-4 py-3 text-left whitespace-nowrap">{t('common_actions.date')}</th>
                                            <th className="px-4 py-3 text-center whitespace-nowrap">{t('common_actions.action')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {filteredList.map((complaint) => (
                                            <tr key={complaint.id} className="table-row border-b last:border-b-0 border-gray-100 hover:bg-gray-50/50">
                                                <td className="px-4 py-3 font-medium text-indigo-600 whitespace-nowrap">{complaint.report_number}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="font-medium text-gray-800">{complaint.users?.full_name}</div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{complaint.brand_name}</td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{complaint.subcategory}</td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge(complaint.status)}</td>
                                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(complaint.created_at)}</td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <Link
                                                        to={`/admin/complaint/${complaint.report_number}`}
                                                        className="inline-flex items-center justify-center p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View (Card-based list) */}
                            <div className="md:hidden flex flex-col">
                                {filteredList.map((complaint, index) => (
                                    <div key={complaint.id} className="bg-white border-b border-gray-200 p-4 last:border-b-0 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400 font-medium text-xs">#{index + 1}</span>
                                                    <Link
                                                        to={`/admin/complaint/${complaint.report_number}`}
                                                        className="text-indigo-600 hover:text-indigo-800 font-bold text-sm"
                                                    >
                                                        {complaint.report_number}
                                                    </Link>
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0">
                                                {getStatusBadge(complaint.status)}
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm mt-3 items-center">
                                            <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('complaint_form.subcategory') || 'Subcategory'}</span>
                                            <span className="text-gray-900 font-medium text-xs">{complaint.subcategory}</span>
                                            
                                            <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('complaint_form.brand') || 'Brand'}</span>
                                            <span className="text-gray-900 font-medium text-xs">{complaint.brand_name}</span>

                                            <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('admin_complaint_detail.defect_details') || 'Defect'}</span>
                                            <span className="text-gray-900 font-medium text-xs line-clamp-2" title={complaint.details || ''}>{complaint.details || '-'}</span>

                                            <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('common_actions.date') || 'Date'}</span>
                                            <span className="text-gray-900 font-medium text-xs">{formatDate(complaint.created_at)}</span>
                                        </div>
                                        
                                        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
                                            <Link
                                                to={`/admin/complaint/${complaint.report_number}`}
                                                className="w-full flex justify-center items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors text-sm font-medium border border-indigo-100"
                                            >
                                                <Eye className="w-4 h-4" />
                                                {t('complaint_list.view') || 'View Details'}
                                            </Link>
                                            <Link
                                                to={`/admin/complaint/${complaint.report_number}/track-repair`}
                                                className="w-full flex justify-center items-center gap-2 px-3 py-2 bg-white text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-medium border border-indigo-200"
                                            >
                                                <MapPin className="w-4 h-4" />
                                                TRACK REPAIR
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
