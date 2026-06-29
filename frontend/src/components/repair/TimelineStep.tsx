import { motion } from 'framer-motion';

interface TimelineStepProps {
    label: string;
    date: string | null;
    isCurrent: boolean;
    isCompleted: boolean;
    isLast: boolean;
}

export default function TimelineStep({ label, date, isCurrent, isCompleted, isLast }: TimelineStepProps) {
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
                {!isLast && (
                    <motion.div
                        className={`w-0.5 h-10 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`}
                        initial={false}
                        animate={{
                            backgroundColor: isCompleted ? '#22c55e' : '#e5e7eb',
                        }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    />
                )}
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
            </motion.div>
        </motion.div>
    );
}
