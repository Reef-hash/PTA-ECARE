import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { RepairStatus } from '../../types';
import TimelineStep, { StepRemark } from './TimelineStep';

export interface TimelineEvent {
    status: RepairStatus;
    label: string;
    date: string | null;
    remark?: StepRemark;
}

interface RepairTimelineProps {
    currentStatus: RepairStatus;
    timelineEvents: TimelineEvent[];
    isClosed: boolean;
}

export default function RepairTimeline({ currentStatus, timelineEvents }: RepairTimelineProps) {
    const { t } = useTranslation();

    const staticStages: { status: RepairStatus; label: string }[] = [
        { status: 'PENDING', label: t('admin_users.status_pending') || 'Pending' },
        { status: 'IN_PROCESS', label: t('admin_users.status_in_process') || 'In Process' },
        { status: 'IN_COMPLETE', label: t('admin_users.status_incomplete') || 'Incomplete' },
        { status: 'COMPLETE', label: t('admin_users.status_closed') || 'Complete' },
    ];

    const stageOrder: Record<RepairStatus, number> = {
        PENDING: 0,
        IN_PROCESS: 1,
        IN_COMPLETE: 2,
        COMPLETE: 3,
    };

    const currentIndex = stageOrder[currentStatus] ?? 0;

    return (
        <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
        >
            <h3 className="text-lg font-semibold mb-6">{t('user_dashboard.track_repair')}</h3>
            <div>
                {staticStages.map((stage, index) => {
                    const isCompleted = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    const isLast = index === staticStages.length - 1;

                    // Cari events/remarks yang berkaitan dengan stage ini
                    const eventsForStage = timelineEvents.filter(e => e.status === stage.status);
                    
                    // Ambil event terakhir untuk dipaparkan sebagai wakil, atau boleh paparkan semua jika mahu
                    // Di sini kita paparkan event terakhir yang mempunyai date/remark
                    const latestEvent = eventsForStage.length > 0 ? eventsForStage[eventsForStage.length - 1] : null;

                    return (
                        <TimelineStep
                            key={`${stage.status}-${index}`}
                            label={stage.label}
                            date={latestEvent?.date || null}
                            isCurrent={isCurrent}
                            isCompleted={isCompleted}
                            isLast={isLast}
                            remark={latestEvent?.remark}
                        />
                    );
                })}
            </div>
        </motion.div>
    );
}
