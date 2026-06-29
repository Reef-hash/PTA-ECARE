import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Wrench, Calendar } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import RepairTimeline from '../../components/repair/RepairTimeline';
import { RepairRecord, RepairTimelineItem } from '../../types';

const DUMMY_REPAIR: RepairRecord = {
    id: 1,
    customer_name: 'Ahmad Zahid',
    device_name: 'HP LaserJet Pro MFP',
    serial_number: 'SN-HP-2024-001',
    problem: 'Printer tidak mahu hidup, lampu power berkelip-kelip.',
    technician: 'Ahmad Technician',
    remark: 'Perlu ganti power supply unit.',
    estimated_completion: '5 Jul 2026',
    status: 'IN_PROCESS',
    created_at: '2026-06-28T10:20:00Z',
    pending_at: '2026-06-28T10:20:00Z',
    in_process_at: '2026-06-29T11:10:00Z',
    in_complete_at: null,
    completed_at: null,
};

function formatDate(dateStr: string | null): string | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

function buildTimeline(repair: RepairRecord): RepairTimelineItem[] {
    return [
        { status: 'PENDING', date: formatDate(repair.pending_at) },
        { status: 'IN_PROCESS', date: formatDate(repair.in_process_at) },
        { status: 'IN_COMPLETE', date: formatDate(repair.in_complete_at) },
        { status: 'COMPLETE', date: formatDate(repair.completed_at) },
    ];
}

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
    PENDING: { label: 'Pending', class: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    IN_PROCESS: { label: 'In Process', class: 'bg-blue-100 text-blue-700 border-blue-200' },
    IN_COMPLETE: { label: 'In Complete / Bawa Pulang', class: 'bg-orange-100 text-orange-700 border-orange-200' },
    COMPLETE: { label: 'Complete (Ready to Pickup)', class: 'bg-green-100 text-green-700 border-green-200' },
};

export default function RepairDetail() {
    const [repair] = useState<RepairRecord>(DUMMY_REPAIR);
    const [isLoading] = useState(false);

    if (isLoading) {
        return (
            <AdminLayout title="Repair Detail" breadcrumb="Repair Detail">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
                </div>
            </AdminLayout>
        );
    }

    const statusInfo = STATUS_BADGE[repair.status] || STATUS_BADGE.PENDING;
    const timeline = buildTimeline(repair);

    return (
        <AdminLayout title="Repair Detail" breadcrumb="Repair Detail">
            {/* Back Button */}
            <Link
                to=".."
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Back
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Repair Header */}
                    <div className="card">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <p className="text-sm text-gray-500">Repair No</p>
                                <h2 className="text-2xl font-bold text-gray-800">
                                    #{String(repair.id).padStart(6, '0')}
                                </h2>
                            </div>
                            <span className={`badge ${statusInfo.class}`}>{statusInfo.label}</span>
                        </div>

                        {/* Customer & Device */}
                        <div className="p-4 bg-gray-50 rounded-lg mb-6">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Customer
                            </h3>
                            <p className="font-medium text-gray-800">{repair.customer_name}</p>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <Wrench className="w-4 h-4" />
                                Device
                            </h3>
                            <p className="font-medium text-gray-800">{repair.device_name}</p>
                        </div>
                    </div>

                    {/* Timeline */}
                    <RepairTimeline currentStatus={repair.status} timeline={timeline} />
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="card">
                        <h3 className="font-semibold mb-4">Repair Information</h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-gray-500">Serial Number</p>
                                <p className="font-medium">{repair.serial_number || '-'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Problem</p>
                                <p className="font-medium">{repair.problem || '-'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Technician</p>
                                <p className="font-medium">{repair.technician || '-'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Remark</p>
                                <p className="font-medium">{repair.remark || '-'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Estimated Completion</p>
                                <p className="font-medium">{repair.estimated_completion || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="card">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Dates
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-gray-500">Created</p>
                                <p className="font-medium">{formatDate(repair.created_at)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
