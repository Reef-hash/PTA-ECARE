import { useState, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { Complaint, Technician } from '../../types';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface ForwardJobModalProps {
    complaint: Complaint;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ForwardJobModal({ complaint, onClose, onSuccess }: ForwardJobModalProps) {
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [selectedTech, setSelectedTech] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    useEffect(() => {
        fetchTechnicians();
    }, []);

    const fetchTechnicians = async () => {
        try {
            const response = await api.get('/admin/technicians');
            // Filter active technicians, optionally exclude the original technician
            const activeTechs = (response.data.technicians || []).filter((t: Technician) => t.is_active);
            setTechnicians(activeTechs);
        } catch (error) {
            toast.error('Gagal memuatkan senarai juruteknik');
        } finally {
            setIsFetching(false);
        }
    };

    const handleForward = async () => {
        if (!selectedTech) {
            toast.error('Sila pilih juruteknik');
            return;
        }

        setIsLoading(true);
        try {
            // Forward the complaint to the selected technician
            await api.post(`/complaints/${complaint.report_number}/forward`, { technician_id: selectedTech });

            toast.success('Tugasan berjaya diagihkan');
            onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal mengagih tugasan');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-800">Forward Job (Agih Tugas)</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <p className="text-sm text-gray-500">No. Laporan</p>
                        <p className="font-medium text-gray-900">{complaint.report_number || `ADU-${complaint.id}`}</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Juruteknik Kedai</label>
                        {isFetching ? (
                            <div className="animate-pulse h-10 bg-gray-200 rounded-lg w-full"></div>
                        ) : (
                            <select 
                                className="input-field w-full"
                                value={selectedTech}
                                onChange={(e) => setSelectedTech(e.target.value)}
                            >
                                <option value="">-- Pilih Juruteknik --</option>
                                {technicians.map(tech => (
                                    <option key={tech.id} value={tech.id}>
                                        {tech.name} {tech.department ? `(${tech.department})` : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                        <p className="text-xs text-gray-500 mt-2">Sistem akan menghantar notifikasi e-mel kepada juruteknik yang dipilih.</p>
                    </div>
                </div>
                
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Batal
                    </button>
                    <button 
                        onClick={handleForward}
                        disabled={isLoading || !selectedTech}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Hantar & Agih
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
