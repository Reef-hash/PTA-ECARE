import { motion } from 'framer-motion';
import { RepairStatus, RepairTimelineItem } from '../../types';
import TimelineStep, { StepRemark } from './TimelineStep';

interface RepairTimelineProps {
    currentStatus: RepairStatus;
    timeline: RepairTimelineItem[];
    stepRemarks?: Record<RepairStatus, StepRemark[]>;
}

const STEP_LABELS: { status: RepairStatus; label: string }[] = [
    { status: 'PENDING', label: 'Pending' },
    { status: 'IN_PROCESS', label: 'In Process' },
    { status: 'IN_COMPLETE', label: 'In Complete / Bawa Pulang' },
    { status: 'COMPLETE', label: 'Complete (Ready to Pickup)' },
];

const STATUS_ORDER: RepairStatus[] = ['PENDING', 'IN_PROCESS', 'IN_COMPLETE', 'COMPLETE'];

export default function RepairTimeline({ currentStatus, timeline, stepRemarks }: RepairTimelineProps) {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);

    return (
        <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
        >
            <h3 className="text-lg font-semibold mb-6">Repair Progress</h3>
            <div className="relative">
                {/* Single continuous vertical line */}
                <div className="absolute left-[10px] top-3 bottom-3 w-0.5 bg-gray-200 rounded" />

                {STEP_LABELS.map((step, index) => {
                    const timelineItem = timeline.find((t) => t.status === step.status);
                    const isCompleted = index < currentIndex;
                    const isCurrent = index === currentIndex;

                    return (
                        <TimelineStep
                            key={step.status}
                            label={step.label}
                            date={timelineItem?.date || null}
                            isCurrent={isCurrent}
                            isCompleted={isCompleted}
                            remarks={stepRemarks?.[step.status]}
                        />
                    );
                })}
            </div>
        </motion.div>
    );
}
