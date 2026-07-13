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
 * Renders ALL events in chronological order (as passed via timelineEvents).
 * 
 * Only appends a single "Closed" future stage at the bottom if the complaint
 * has not yet reached a final state.
 */
export default function RepairTimeline({ timelineEvents, isClosed }: RepairTimelineProps) {
    const { t } = useTranslation();

    // The single "future" stage we ever show is Closed.
    const futureStages = !isClosed ? [
        {
            status: 'COMPLETE' as RepairStatus,
            label: t('admin_users.status_closed') || 'Closed',
            date: null,
            remark: undefined,
            isFuture: true,
        }
    ] : [];

    // Combine: all real events (dynamic, chronological) + the single waiting stage
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
