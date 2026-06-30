import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function ScrollIndicator() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const checkScrollable = () => {
            const isScrollable = document.documentElement.scrollHeight > window.innerHeight + 80;
            const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 10;
            setShow(isScrollable && !isAtBottom);
        };

        const timer = setTimeout(checkScrollable, 500);

        const handleScroll = () => {
            checkScrollable();
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', checkScrollable);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', checkScrollable);
        };
    }, []);

    if (!show) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none md:hidden">
            <div className="flex flex-col items-center gap-1 animate-bounce">
                <span className="text-[10px] font-semibold text-gray-500 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-lg border border-gray-200">
                    Scroll ke bawah
                </span>
                <div className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 flex items-center justify-center">
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                </div>
            </div>
        </div>
    );
}
