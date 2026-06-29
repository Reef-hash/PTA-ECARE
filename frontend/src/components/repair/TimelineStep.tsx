import { motion } from 'framer-motion';

export interface StepRemark {
    remarkBy: string;
    remark: string | null;
    noteTransport: string | null;
    checking: string | null;
}

interface TimelineStepProps {
    label: string;
    date: string | null;
    isCurrent: boolean;
    isCompleted: boolean;
    remarks?: StepRemark[];
}

export default function TimelineStep({ label, date, isCurrent, isCompleted, remarks }: TimelineStepProps) {
    const circleColor = isCompleted
        ? 'bg-green-500'
        : isCurrent
            ? 'bg-blue-500 ring-4 ring-blue-200'
            : 'bg-gray-300';

    const textColor = isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400';
    const dateColor = isCompleted || isCurrent ? 'text-gray-500' : 'text-gray-300';

    return (
        <motion.div
            className="relative flex items-start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
        >
            <div className="flex flex-col items-center">
                <motion.div
                    className={`w-5 h-5 rounded-full ${circleColor} z-10`}
                    initial={false}
                    animate={{
                        scale: isCurrent ? [1, 1.3, 1] : 1,
                        backgroundColor: isCompleted ? '#22c55e' : isCurrent ? '#3b82f6' : '#d1d5db',
                    }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                />
            </div>
            <motion.div
                className="ml-4 pb-8"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                <p className={`text-sm font-medium ${textColor} transition-colors duration-300`}>
                    {label}
                </p>
                {date ? (
                    <p className={`text-xs ${dateColor} mt-0.5 transition-colors duration-300`}>{date}</p>
                ) : (
                    <p className="text-xs text-gray-300 mt-0.5 italic">Waiting...</p>
                )}
                {remarks && remarks.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {remarks.map((r, i) => (
                            <motion.div
                                key={i}
                                className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.1 }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-gray-500">by {r.remarkBy}</span>
                                </div>
                                {r.remark && <p className="text-sm text-gray-700 mb-1">{r.remark}</p>}
                                {r.noteTransport && (
                                    <p className="text-xs text-gray-500"><strong>Transport:</strong> {r.noteTransport}</p>
                                )}
                                {r.checking && (
                                    <p className="text-xs text-gray-500"><strong>Checking:</strong> {r.checking}</p>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
