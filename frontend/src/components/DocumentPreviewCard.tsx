import React from 'react';
import { FileText, ZoomIn, Download } from 'lucide-react';
import { getFileUrl } from '../services/api';
import toast from 'react-hot-toast';

// Helper untuk mendapatkan URL preview melalui endpoint download (mengelakkan pemotongan query param oleh CDN)
export const getPreviewUrl = (path: string | undefined | null, defaultFilename: string = 'preview'): string => {
    if (!path) return '';
    const fileUrl = getFileUrl(path);
    const baseApi = import.meta.env.VITE_API_URL || '/api';
    const apiUrl = baseApi === 'https://api.ptas.my' ? 'https://api.ptas.my/api' : baseApi;
    const filename = path.split('/').pop() || defaultFilename;
    return `${apiUrl}/download?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(filename)}&inline=true`;
};

// Helper untuk menyemak format fail PDF dengan tepat (menyokong format URL standard & URL download)
export const isPdfFile = (path: string | undefined | null): boolean => {
    if (!path) return false;
    return decodeURIComponent(path).toLowerCase().includes('.pdf');
};

// Download file from URL (works for cross-origin)
export const handleDownloadFile = (url: string, filename: string) => {
    toast.loading('Memuat turun...', { id: 'download' });
    const baseApi = import.meta.env.VITE_API_URL || '/api';
    const apiUrl = baseApi === 'https://api.ptas.my' ? 'https://api.ptas.my/api' : baseApi;
    
    const downloadUrl = `${apiUrl}/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => toast.success('Berjaya memuat turun fail!', { id: 'download' }), 1000);
};

interface DocumentPreviewCardProps {
    file: string | null | undefined;
    reportNumber: string;
    title: string;
    subtitle?: string;
    colorTheme?: 'blue' | 'green';
    defaultFilenamePrefix?: string;
    onZoom: (url: string) => void;
}

const DocumentPreviewCard: React.FC<DocumentPreviewCardProps> = ({
    file,
    reportNumber,
    title,
    subtitle = 'Document',
    colorTheme = 'blue',
    defaultFilenamePrefix = 'Document',
    onZoom,
}) => {
    if (!file) return null;

    const isPdf = isPdfFile(file);
    const previewUrl = getPreviewUrl(file, `${defaultFilenamePrefix}-${reportNumber}.${isPdf ? 'pdf' : 'png'}`);
    const downloadUrl = getFileUrl(file) || file;
    const downloadFilename = `${defaultFilenamePrefix}-${reportNumber}.${isPdf ? 'pdf' : 'png'}`;

    const themeClasses = colorTheme === 'green' ? {
        border: 'border-green-200',
        bgGradient: 'from-green-50 to-white',
        headerBg: 'bg-green-50 border-green-100',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        titleColor: 'text-green-800',
        subtitleColor: 'text-green-400',
        buttonColor: 'text-green-500 hover:text-green-700 hover:bg-green-100',
        downloadButtonColor: 'text-green-500 hover:text-green-600 hover:bg-green-100',
        zoomIconColor: 'text-green-600',
    } : {
        border: 'border-blue-200',
        bgGradient: 'from-blue-50 to-white',
        headerBg: 'bg-blue-50 border-blue-100',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        titleColor: 'text-blue-800',
        subtitleColor: 'text-blue-400',
        buttonColor: 'text-blue-500 hover:text-blue-700 hover:bg-blue-100',
        downloadButtonColor: 'text-blue-500 hover:text-green-600 hover:bg-blue-100',
        zoomIconColor: 'text-blue-600',
    };

    return (
        <div className={`group rounded-xl border ${themeClasses.border} bg-gradient-to-b ${themeClasses.bgGradient} overflow-hidden shadow-sm hover:shadow-md transition-all duration-300`}>
            <div className={`px-4 py-3 ${themeClasses.headerBg} border-b flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 ${themeClasses.iconBg} rounded-lg flex items-center justify-center`}>
                        <FileText className={`w-4 h-4 ${themeClasses.iconColor}`} />
                    </div>
                    <div>
                        <p className={`font-semibold ${themeClasses.titleColor} text-sm`}>{title}</p>
                        <p className={`text-[10px] ${themeClasses.subtitleColor} uppercase tracking-wider`}>{subtitle}</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => onZoom(previewUrl)}
                        className={`p-1.5 ${themeClasses.buttonColor} rounded-lg transition-all`}
                        title="Zoom"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleDownloadFile(downloadUrl, downloadFilename)}
                        className={`p-1.5 ${themeClasses.downloadButtonColor} rounded-lg transition-all`}
                        title="Download"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>
            {/* Preview Area */}
            <div
                className="relative cursor-pointer"
                onClick={() => onZoom(previewUrl)}
            >
                {isPdf ? (
                    <div className="relative w-full h-48 overflow-hidden rounded-md bg-white">
                        <iframe
                            src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`}
                            className="absolute top-0 left-0 border-0 pointer-events-none"
                            style={{
                                width: 'calc(100% + 20px)',
                                height: '100%',
                            }}
                            title={`${title} Preview`}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all duration-300">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                                    <ZoomIn className={`w-5 h-5 ${themeClasses.zoomIconColor}`} />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="relative overflow-hidden">
                        <img
                            src={previewUrl}
                            alt={title}
                            className="w-full h-48 object-contain bg-white p-2 group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                if (target.parentElement) {
                                    target.parentElement.innerHTML = '<div class="flex flex-col items-center justify-center py-8 px-4 gap-2 text-slate-500 text-center"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg><span class="text-xs font-semibold text-slate-700">Tidak dapat papar preview</span><span class="text-[11px] text-slate-500">Sila muat turun untuk lihat</span></div>';
                                }
                            }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all duration-300">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                                    <ZoomIn className={`w-5 h-5 ${themeClasses.zoomIconColor}`} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentPreviewCard;
