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
        <div className="relative flex items-start">
            <div className="flex flex-col items-center">
                <div className={`w-5 h-5 rounded-full ${circleColor} transition-all duration-300 z-10`} />
                {!isLast && (
                    <div className={`w-0.5 h-10 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'} transition-colors duration-300`} />
                )}
            </div>
            <div className="ml-4 pb-8">
                <p className={`text-sm font-medium ${textColor} transition-colors duration-300`}>
                    {label}
                </p>
                {date ? (
                    <p className={`text-xs ${dateColor} mt-0.5 transition-colors duration-300`}>{date}</p>
                ) : (
                    <p className="text-xs text-gray-300 mt-0.5 italic">Waiting...</p>
                )}
            </div>
        </div>
    );
}
