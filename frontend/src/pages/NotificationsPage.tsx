import { useState, useEffect } from 'react';
import { Bell, ArrowLeft, CheckCheck } from 'lucide-react';
import api from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Notification {
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    type: string;
    reference_id: number;
    created_at: string;
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadCountsObj, setUnreadCountsObj] = useState<any>({ all: 0, customer: 0, technician: 0, main_technician: 0 });
    const [activeTab, setActiveTab] = useState<string>('all');
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const isAdmin = location.pathname.startsWith('/admin') && !location.pathname.startsWith('/admin/technician');

    const fetchNotifications = async () => {
        try {
            const endpoint = isAdmin ? `/notifications?category=${activeTab}` : '/notifications';
            const res = await api.get(endpoint);
            setNotifications(res.data.notifications);
            setUnreadCount(res.data.unread_count);
            if (res.data.unread_counts) {
                setUnreadCountsObj(res.data.unread_counts);
            }
        } catch (error) {
            console.error('Failed to fetch notifications');
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [activeTab]);

    const handleMarkAsRead = async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read');
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.put('/notifications/all/read');
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read');
        }
    };

    const handleClickNotification = async (notification: Notification) => {
        if (!notification.is_read) {
            await handleMarkAsRead(notification.id);
        }

        const uidMatch = notification.message.match(/\buid:([a-zA-Z0-9-]+)/);
        if (uidMatch) {
            navigate(`/admin/users/${uidMatch[1]}`);
            return;
        }

        const isProfileOrPassword = notification.title.includes('Profil') || notification.title.includes('Kata Laluan') ||
            notification.title.includes('Profile') || notification.title.includes('Password');
        const hasValidReferenceId = notification.reference_id && notification.reference_id > 0;

        const resolveAndNavigate = async (basePath: string) => {
            if (!hasValidReferenceId) {
                navigate(basePath);
                return;
            }
            try {
                const { data } = await api.get(`/complaints/resolve-id/${notification.reference_id}`);
                const reportNumber = data.report_number;
                const path = location.pathname;
                
                const isStatusUpdate = notification.title.toLowerCase().includes('status') || 
                                       notification.title.toLowerCase().includes('kemaskini') ||
                                       notification.title.toLowerCase().includes('diproses') ||
                                       notification.title.toLowerCase().includes('selesai') ||
                                       notification.type === 'status_update' || 
                                       notification.type === 'status_update_detailed';
                                       
                if (path.startsWith('/users')) {
                    if (isStatusUpdate) {
                        navigate(`/users/complaint/${reportNumber}/track-repair`);
                    } else {
                        navigate(`/users/complaint/${reportNumber}`);
                    }
                } else if (path.startsWith('/admin/technician')) {
                    navigate(`/admin/technician/complaint/${reportNumber}`);
                } else {
                    navigate(`/admin/complaint/${reportNumber}`);
                }
            } catch {
                navigate(basePath);
            }
        };

        const path = location.pathname;
        if (path.startsWith('/users')) {
            if (isProfileOrPassword) {
                navigate('/users/profile');
            } else {
                resolveAndNavigate('/users/complaint-history');
            }
        } else if (path.startsWith('/admin/technician')) {
            resolveAndNavigate('/admin/technician/complaints');
        } else {
            resolveAndNavigate('/admin/complaints');
        }
    };

    const getTranslatedNotification = (notification: Notification): { title: string; message: string } => {
        try {
            if (notification.message.trim().startsWith('{')) {
                const parsed = JSON.parse(notification.message);
                if (parsed && parsed.key) {
                    const params = parsed.params || {};
                    if (parsed.key === 'notif_processing_user') {
                        return {
                            title: (t?.(`notification.${parsed.key}_title`, params) as string) || `Status Update: ${params.id}`,
                            message: (t?.(`notification.${parsed.key}_body`, params) as string) || `Complaint ${params.id} is in process.`
                        };
                    }
                    return {
                        title: (t?.(`notification.${parsed.key.replace('_body', '_title')}`, params) || t?.(parsed.key.replace('_body', '_title')) || notification.title) as string,
                        message: (t?.(`notification.${parsed.key}`, params) || t?.(parsed.key) || notification.message) as string
                    };
                }
            }
        } catch (e) { /* fall through */ }

        let reportMatch = notification.title.match(/[A-Z]+\d+/) || notification.message.match(/[A-Z]+\d+/);
        const reportNumber = reportMatch ? reportMatch[0] : '';
        const complaintId = notification.reference_id;
        const statusMatch = notification.message.match(/'([^']+)'/);
        const rawStatus = statusMatch ? statusMatch[1] : '';

        let translatedStatus = rawStatus;
        if (rawStatus === 'pending' || rawStatus.toLowerCase().includes('pending') || rawStatus.toLowerCase().includes('menunggu')) {
            translatedStatus = t('notification.status_pending');
        } else if (rawStatus === 'in_process' || rawStatus.toLowerCase().includes('process') || rawStatus.toLowerCase().includes('diproses')) {
            translatedStatus = t('notification.status_in_process');
        } else if (rawStatus === 'closed' || rawStatus.toLowerCase().includes('closed') || rawStatus.toLowerCase().includes('selesai')) {
            translatedStatus = t('notification.status_closed');
        }

        if (notification.title.includes('Profil Dikemaskini') || notification.title.includes('Profile Updated') ||
            notification.title.includes('Kata Laluan Ditukar') || notification.title.includes('Password Changed') ||
            notification.title.includes('Aduan Dibatalkan') || notification.title.includes('Complaint Cancelled')) {
            return { title: notification.title, message: notification.message };
        }
        if (notification.title.includes('Aduan Berjaya Didaftarkan') || notification.title.includes('Complaint Successfully Registered')) {
            return {
                title: notification.title,
                message: notification.message
            };
        }
        if (notification.title.includes('Status Aduan Dikemaskini') || notification.title.includes('Complaint Status Updated')) {
            return {
                title: t('notification.user_status_updated_title') as string,
                message: (t('notification.user_status_updated_msg', { report_number: reportNumber, status: translatedStatus }) || notification.message) as string
            };
        }

        if (notification.type === 'status_update') {
            if (notification.title.includes('Aduan Baru') || notification.title.includes('New Complaint')) {
                const nameMatch = notification.message.match(/daripada\s+(.*?)(?:\.\s+Sila|\.)/);
                const userName = nameMatch ? nameMatch[1].trim() : 'User';
                return {
                    title: (t('notification.new_complaint_title', { report_number: reportNumber }) || notification.title) as string,
                    message: (t('notification.new_complaint_msg', { user_name: userName }) || notification.message) as string
                };
            } else {
                return {
                    title: (t('notification.status_update_title', { report_number: reportNumber || complaintId }) || notification.title) as string,
                    message: (t('notification.status_update_msg', { report_number: reportNumber || complaintId, status: translatedStatus }) || notification.message) as string
                };
            }
        } else if (notification.type === 'assignment') {
            return {
                title: (t('notification.job_assigned_title', { report_number: reportNumber || complaintId }) || notification.title) as string,
                message: (t('notification.job_assigned_msg', { report_number: reportNumber || complaintId }) || notification.message) as string
            };
        }

        const statusDetailMatch = notification.message.match(/Complaint (?:is being processed|was complete repaired) by (.*?) on (.*)/) ||
            notification.message.match(/Status Update \[([A-Z0-9]+)\]: Service (.*?) by Technician (.*?) on (.*?)\./);
        const titleMatch = notification.title.match(/([A-Z][0-9]+)/);
        const reportNo = titleMatch ? titleMatch[1] : (notification.message.match(/Complaint ([A-Z0-9]+)/)?.[1] || '---');

        if (statusDetailMatch) {
            let techName, dateString;
            const isCompleted = notification.message.toLowerCase().includes('completed') || notification.message.toLowerCase().includes('repaired');
            if (statusDetailMatch.length === 3) {
                techName = statusDetailMatch[1];
                dateString = statusDetailMatch[2];
            } else {
                techName = statusDetailMatch[3];
                dateString = statusDetailMatch[4];
            }
            let cleanDateStr = dateString.replace('. Item ready for pickup.', '').trim();
            const parts = cleanDateStr.split(' at ');
            const dateOnly = parts[0];
            const timeOnly = parts.length > 1 ? parts[1] : '';

            return {
                title: (isCompleted
                    ? (t?.('notification.notif_completed_title', { id: reportNo }) || `Status Update: ${reportNo}`)
                    : (t?.('notification.notif_processing_title', { id: reportNo }) || `Status Update: ${reportNo}`)) as string,
                message: (isCompleted
                    ? (t?.('notification.notif_completed_body', { id: reportNo, name: techName, date: dateOnly, time: timeOnly }) || notification.message)
                    : (t?.('notification.notif_processing_body', { id: reportNo, name: techName, date: dateOnly, time: timeOnly }) || notification.message)) as string
            };
        }

        // Match Admin New Complaint "Ahmad Zahid telah membuat aduan PTAS00001"
        const adminNewMatch = notification.title.match(/^(.*?) telah membuat aduan ([A-Z0-9]+)$/);
        if (adminNewMatch) {
            const userName = adminNewMatch[1];
            const repNo = adminNewMatch[2];
            const isMalay = i18n.language === 'ms';
            return {
                title: isMalay ? `${userName} telah membuat aduan ${repNo}` : `${userName} has registered complaint ${repNo}`,
                message: notification.message
            };
        }

        // Match Admin Cancel "Pelanggan : Ahmad Zahid telah membatalkan aduan PTAS00001."
        const adminCancelMatch = notification.title.match(/^Pelanggan : (.*?) telah membatalkan aduan ([A-Z0-9]+)\.?$/);
        if (adminCancelMatch) {
            const userName = adminCancelMatch[1];
            const repNo = adminCancelMatch[2];
            const isMalay = i18n.language === 'ms';
            return {
                title: isMalay ? `Pelanggan : ${userName} telah membatalkan aduan ${repNo}.` : `Customer : ${userName} has cancelled complaint ${repNo}.`,
                message: isMalay ? notification.message : notification.message.replace('Klik untuk semak', 'Click to review')
            };
        }

        // Match "Juruteknik X Telah mengemaskini Aduan Y" or "Pihak Pengurusan Telah mengemaskini Aduan Y"
        const updateDetailMatch = notification.title.match(/^(.*?) Telah mengemaskini Aduan ([A-Z0-9]+)$/);
        if (updateDetailMatch) {
            const updater = updateDetailMatch[1];
            const repNo = updateDetailMatch[2];
            const isMalay = i18n.language === 'ms';
            
            let translatedTitle = notification.title;
            let translatedMessage = notification.message;

            if (!isMalay) {
                let transUpdater = updater;
                if (updater.startsWith('Juruteknik')) {
                    transUpdater = updater.replace('Juruteknik', 'Technician');
                } else if (updater === 'Pihak Pengurusan') {
                    transUpdater = 'Management';
                }
                translatedTitle = `${transUpdater} has updated Complaint ${repNo}`;

                translatedMessage = translatedMessage
                    .replace('Maklumat berikut:', 'Following details:')
                    .replace('~ Status : inproces', '~ Status : In Process')
                    .replace('~ Status : Selesai', '~ Status : Completed')
                    .replace('~ Status : Incomplete', '~ Status : Incomplete')
                    .replace('~ Status : Bawa Pulang', '~ Status : Brought Home');
            } else {
                translatedMessage = translatedMessage
                    .replace('~ Status : inproces', '~ Status : Dalam Proses');
            }

            return {
                title: translatedTitle,
                message: translatedMessage
            };
        }

        // Match User Cancel "Cancelled on 16 Jul 2026 at 04:17 PM"
        const userCancelMatch = notification.message.match(/^Cancelled on (.*?)$/);
        if (userCancelMatch) {
            const dateStr = userCancelMatch[1];
            const isMalay = i18n.language === 'ms';
            return {
                title: isMalay ? `Status Aduan: ${reportNumber || reportNo}` : `Status Update: ${reportNumber || reportNo}`,
                message: isMalay ? `Dibatalkan pada ${dateStr}` : notification.message
            };
        }

        return {
            title: notification.title,
            message: notification.message.replace(/\|\s*uid:[a-zA-Z0-9-]+/, '').trim()
        };
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const isMalay = i18n.language === 'ms';
        const locale = isMalay ? 'ms-MY' : 'en-US';
        const dateFormatted = date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
        let timeFormatted = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true });
        if (isMalay) {
            timeFormatted = timeFormatted.replace('AM', 'PG').replace('PM', 'PTG');
        }
        return `${dateFormatted}, ${timeFormatted}`;
    };

    const getBackPath = () => {
        const path = location.pathname;
        if (path.startsWith('/users')) return '/users/dashboard';
        if (path.startsWith('/admin/technician')) return '/admin/technician/dashboard';
        return '/admin/dashboard';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-3xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(getBackPath())}
                            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">{t('common.notifications')}</h1>
                            {unreadCount > 0 && (
                                <p className="text-sm text-gray-500">{unreadCount} {t('common.unread', 'unread')}</p>
                            )}
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
                        >
                            <CheckCheck className="w-4 h-4" />
                            {t('common.mark_all_read')}
                        </button>
                    )}
                </div>

                {isAdmin && (
                    <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                        {[
                            { id: 'all', label: 'Semua', count: unreadCountsObj.all },
                            { id: 'customer', label: 'Customer', count: unreadCountsObj.customer },
                            { id: 'technician', label: 'Technician', count: unreadCountsObj.technician },
                            { id: 'main_technician', label: 'Main Technician', count: unreadCountsObj.main_technician },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                                        activeTab === tab.id
                                            ? 'bg-white/20 text-white'
                                            : 'bg-red-100 text-red-600'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Notification List */}
                {notifications.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                        <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500">{t('common.no_notifications')}</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                        {notifications.map((notification) => {
                            const translated = getTranslatedNotification(notification);
                            return (
                                <div
                                    key={notification.id}
                                    onClick={() => handleClickNotification(notification)}
                                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.is_read ? 'bg-blue-50/50' : ''}`}
                                >
                                    <div className="flex gap-3">
                                        <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${!notification.is_read ? 'bg-indigo-500' : 'bg-gray-200'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                                                {translated.title}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">
                                                {translated.message}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-2">
                                                {formatDate(notification.created_at)}
                                            </p>
                                        </div>
                                        {!notification.is_read && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMarkAsRead(notification.id);
                                                }}
                                                className="self-start text-xs text-indigo-500 hover:text-indigo-700 whitespace-nowrap"
                                            >
                                                {t('common.mark_read', 'Mark read')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
