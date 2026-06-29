import { RepairStatus, RepairTimelineItem } from '../../types';
import TimelineStep from './TimelineStep';

interface RepairTimelineProps {
    currentStatus: RepairStatus;
    timeline: RepairTimelineItem[];
}

const STEP_LABELS: { status: RepairStatus; label: string }[] = [
    { status: 'PENDING', label: 'Pending' },
    { status: 'IN_PROCESS', label: 'In Process' },
    { status: 'IN_COMPLETE', label: 'In Complete / Bawa Pulang' },
    { status: 'COMPLETE', label: 'Complete (Ready to Pickup)' },
];

const STATUS_ORDER: RepairStatus[] = ['PENDING', 'IN_PROCESS', 'IN_COMPLETE', 'COMPLETE'];

export default function RepairTimeline({ currentStatus, timeline }: RepairTimelineProps) {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);

    return (
        <div className="card">
            <h3 className="text-lg font-semibold mb-6">Repair Progress</h3>
            <div className="flex flex-col">
                {STEP_LABELS.map((step, index) => {
                    const timelineItem = timeline.find((t) => t.status === step.status);
                    const isCompleted = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    const isLast = index === STEP_LABELS.length - 1;

                    return (
                        <TimelineStep
                            key={step.status}
                            label={step.label}
                            date={timelineItem?.date || null}
                            isCurrent={isCurrent}
                            isCompleted={isCompleted}
                            isLast={isLast}
                        />
                    );
                })}
            </div>
        </div>
    );
}
