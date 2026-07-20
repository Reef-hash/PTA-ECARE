import { Forward } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface ForwardHistoryEntry {
    id: string;
    techName: string;
    createdAt: string;
    forwardedByRole: 'admin' | 'main_technician' | string;
}

interface ForwardHistoryListProps {
    entries: ForwardHistoryEntry[];
}

export default function ForwardHistoryList({ entries }: ForwardHistoryListProps) {
    const { t } = useTranslation();

    if (entries.length === 0) return null;

    return (
        <div className="mb-6">
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-indigo-700">
                <Forward className="w-4 h-4" />
                Kerja Ditugaskan
            </h4>
            <div className="space-y-2">
                {entries.map(entry => {
                    const roleLabel = entry.forwardedByRole === 'main_technician' ? t('common.main_technician') : t('common.admin');
                    return (
                        <div key={entry.id} className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-sm">
                                <Forward className="w-3.5 h-3.5 text-indigo-500" />
                                <span className="text-indigo-700">
                                    Diagihkan kepada: <strong>{entry.techName}</strong>
                                </span>
                                <span className="text-xs text-indigo-400 ml-auto">{entry.createdAt}</span>
                            </div>
                            <p className="text-xs text-indigo-400 mt-0.5 ml-6">
                                oleh {roleLabel}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
