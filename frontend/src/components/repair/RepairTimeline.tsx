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

/**
 * Dynamic Timeline Component
 * 
 * Instead of mapping events to 4 fixed static slots, this renders
 * ALL events in chronological order (as passed via timelineEvents).
 * 
 * After the last real event, it appends "future" stages that haven't
 * been reached yet as greyed-out "Waiting..." nodes.
 * 
 * This correctly handles repeat flows like:
 * Pending → In Process → Incomplete → In Process (again) → Closed
 */
export default function RepairTimeline({ currentStatus, timelineEvents, isClosed }: RepairTimelineProps) {
    const { t } = useTranslation();

    // Define the full lifecycle order for determining what comes "next"
    const lifecycleOrder: { status: RepairStatus; label: string }[] = [
        { status: 'PENDING', label: t('admin_users.status_pending') || 'Pending' },
        { status: 'IN_PROCESS', label: t('admin_users.status_in_process') || 'In Process' },
        { status: 'IN_COMPLETE', label: t('admin_users.status_incomplete') || 'Incomplete / Bawa Pulang' },
        { status: 'COMPLETE', label: t('admin_users.status_closed') || 'Closed' },
    ];

    const stageOrder: Record<RepairStatus, number> = {
        PENDING: 0,
        IN_PROCESS: 1,
        IN_COMPLETE: 2,
        COMPLETE: 3,
    };

    // Determine the highest status reached from the actual events
    const currentIndex = stageOrder[currentStatus] ?? 0;

    // Build the "future" stages that come AFTER the current status
    // These are stages that haven't been reached yet → shown as "Waiting..."
    const futureStages = lifecycleOrder
        .filter(stage => stageOrder[stage.status] > currentIndex)
        .map(stage => ({
            status: stage.status,
            label: stage.label,
            date: null as string | null,
            remark: undefined as StepRemark | undefined,
            isFuture: true,
        }));

    // Combine: all real events (dynamic, chronological) + future waiting stages
    const allNodes = [
        ...timelineEvents.map(ev => ({ ...ev, isFuture: false })),
        ...futureStages,
    ];

    const totalNodes = allNodes.length;

    return (
        <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
        >
            <h3 className="text-lg font-semibold mb-6">{t('user_dashboard.track_repair')}</h3>
            <div>
                {allNodes.map((node, index) => {
                    const isLast = index === totalNodes - 1;
                    const isFuture = node.isFuture;

                    // For real events: the LAST real event is "current", everything before it is "completed"
                    // For future stages: they are neither current nor completed
                    const lastRealIndex = timelineEvents.length - 1; // index of last real event in allNodes
                    const isCompleted = !isFuture && index < lastRealIndex;
                    const isCurrent = !isFuture && index === lastRealIndex;

                    return (
                        <TimelineStep
                            key={`timeline-${index}`}
                            label={node.label}
                            date={node.date || null}
                            isCurrent={isCurrent}
                            isCompleted={isCompleted}
                            isLast={isLast}
                            remark={node.remark}
                        />
                    );
                })}
            </div>
        </motion.div>
    );
}
