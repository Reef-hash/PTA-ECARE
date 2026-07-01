import { motion } from 'framer-motion';
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

export default function RepairTimeline({ currentStatus: _currentStatus, timelineEvents, isClosed }: RepairTimelineProps) {
    // If not closed, we append a waiting placeholder at the end
    const nodes = [...timelineEvents];
    
    if (!isClosed) {
        nodes.push({
            status: 'COMPLETE',
            label: 'Complete (Ready to Pickup)',
            date: null, // "Waiting..."
        });
    }

    // Determine the active index.
    // For chronological nodes, all nodes with a date are completed or current.
    // The last node with a date is "current".
    const lastEventIndex = nodes.map(n => !!n.date).lastIndexOf(true);
    const currentIndex = lastEventIndex >= 0 ? lastEventIndex : 0;

    return (
        <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
        >
            <h3 className="text-lg font-semibold mb-6">Track Repair Progress</h3>
            <div>
                {nodes.map((node, index) => {
                    const isCompleted = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    const isLast = index === nodes.length - 1;

                    return (
                        <TimelineStep
                            key={`${node.status}-${index}`}
                            label={node.label}
                            date={node.date}
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
