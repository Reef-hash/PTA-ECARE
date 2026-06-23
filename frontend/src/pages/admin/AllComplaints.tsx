import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Printer, Filter, X, Trash2 } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import { Complaint } from '../../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { parseNotificationMessage } from '../../utils/notificationParser';

interface AllComplaintsProps {
    status?: 'all' | 'pending' | 'in_process' | 'closed' | 'not_forwarded' | 'job_assigned' | 'cancelled';
}

interface Technician {
    id: string;
    name: string;
    username: string;
}

export default function AllComplaints({ status = 'all' }: AllComplaintsProps) {
    const { t, i18n } = useTranslation();
    const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Advanced filters
    const [showFilters, setShowFilters] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterSubcategory, setFilterSubcategory] = useState('');
    const [filterBrand, setFilterBrand] = useState('');
    const [filterTechnician, setFilterTechnician] = useState('');
    const [filterDate, setFilterDate] = useState('');

    // Filter options from data
    const [technicians, setTechnicians] = useState<Technician[]>([]);

    const getPageTitle = (s: string) => {
        switch (s) {
            case 'pending': return t('complaint_list.title_pending');
            case 'in_process': return t('complaint_list.title_in_process');
            case 'closed': return t('complaint_list.title_closed');
            case 'not_forwarded': return t('complaint_list.title_not_forwarded');
            case 'job_assigned': return t('complaint_list.title_job_assigned');
            case 'cancelled': return t('complaint_list.title_cancelled');
            default: return t('complaint_list.title_all');
        }



                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center mt-6 gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 rounded bg-gray-100 text-gray-600 disabled:opacity-50 hover:bg-gray-200"
                                >
                                    &lt;
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`px-3 py-1 rounded ${currentPage === i + 1 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 rounded bg-gray-100 text-gray-600 disabled:opacity-50 hover:bg-gray-200"
                                >
                                    &gt;
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
