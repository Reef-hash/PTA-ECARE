
import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
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

import notificationSound from '../assets/notification.mp3';

// Notification sound
const NOTIFICATION_SOUND_URL = notificationSound;

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const prevUnreadCountRef = useRef<number>(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isFirstLoadRef = useRef(true);
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    const lastNotificationIdRef = useRef<string | null>(null);

    // Initialize audio on mount
    useEffect(() => {
        audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
        audioRef.current.volume = 1.0; // Increase volume
    }, []);

    // Play notification sound
    const playNotificationSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            const promise = audioRef.current.play();
            if (promise !== undefined) {
                promise.catch((error) => {
                    console.error('Audio play failed:', error);
                    // attempt to resume audio context if suspended
                });
            }
        }
    }, []);

    // Helper to translate notification content based on type
    const getTranslatedNotification = (notification: Notification): { title: string; message: string } => {
        // [HYBRID STORAGE STRATEGY]
        // 1. Try to parse message as JSON (New Format)
        try {
            // Check if message looks like JSON to avoid unnecessary throwing
            if (notification.message.trim().startsWith('{')) {
                const parsed = JSON.parse(notification.message);
                if (parsed && parsed.key) {
                    // It's a structured notification!
                    // It's a structured notification!
                    const params = parsed.params || {};

                    // [ANTIGRAVITY PROTOCOL] Targeted Logic for User Processing
                    if (parsed.key === 'notif_processing_user') {
                        return {
                            title: (t?.(`notification.${parsed.key}_title`, params) as string) || `Status Update: ${params.id}`,
                            message: (t?.(`notification.${parsed.key}_body`, params) as string) || `Complaint ${params.id} is in process.`
                        };
                    }

                    // Default handling for other structured notifications
                    return {
                        title: (t?.(`notification.${parsed.key.replace('_body', '_title')}`, params)
                            || t?.(parsed.key.replace('_body', '_title'))
                            || notification.title) as string,
                        message: (t?.(`notification.${parsed.key}`, params)
                            || t?.(parsed.key)
                            || notification.message) as string
                    };
                }
            }
        } catch (e) {
            // Not JSON, fall back to legacy processing below
        }

        // 2. Legacy Processing (Regex & String Matching)
        const safeTitle = notification.title || '';
        const safeMessage = notification.message || '';

        // Extract data from original message/title for translation
        let reportMatch = safeTitle.match(/[A-Z]\d+/);
        if (!reportMatch) {
            reportMatch = safeMessage.match(/[A-Z]\d+/);
        }
        const reportNumber = reportMatch ? reportMatch[0] : '';
        const complaintId = notification.reference_id;

        // Try to extract status from message
        const statusMatch = safeMessage.match(/'([^']+)'/);
        const rawStatus = statusMatch ? statusMatch[1] : '';

        // Translate status
        let translatedStatus = rawStatus;
        if (rawStatus === 'pending' || rawStatus.toLowerCase().includes('pending') || rawStatus.toLowerCase().includes('menunggu')) {
            translatedStatus = t('notification.status_pending');
        } else if (rawStatus === 'in_process' || rawStatus.toLowerCase().includes('process') || rawStatus.toLowerCase().includes('diproses')) {
            translatedStatus = t('notification.status_in_process');
        } else if (rawStatus === 'closed' || rawStatus.toLowerCase().includes('closed') || rawStatus.toLowerCase().includes('selesai')) {
            translatedStatus = t('notification.status_closed');
        }

        // User-specific notifications (profile, password, cancelled complaint)
        if (safeTitle.includes('Profil Dikemaskini') || safeTitle.includes('Profile Updated')) {
            return {
                title: safeTitle,
                message: safeMessage
            };
        }
        if (safeTitle.includes('Kata Laluan Ditukar') || safeTitle.includes('Password Changed')) {
            return {
                title: safeTitle,
                message: safeMessage
            };
        }
        if (safeTitle.includes('Aduan Dibatalkan') || safeTitle.includes('Complaint Cancelled')) {
            return {
                title: safeTitle,
                message: safeMessage
            };
        }
        if (safeTitle.includes('Aduan Berjaya Didaftarkan') || safeTitle.includes('Complaint Successfully Registered')) {
            return {
                title: t('notification.user_complaint_created_title') as string,
                message: (t('notification.user_complaint_created_msg', { report_number: reportNumber }) || safeMessage) as string
            };
        }
        if (safeTitle.includes('Status Aduan Dikemaskini') || safeTitle.includes('Complaint Status Updated')) {
            return {
                title: t('notification.user_status_updated_title') as string,
                message: (t('notification.user_status_updated_msg', { report_number: reportNumber, status: translatedStatus }) || safeMessage) as string
            };
        }

        // Translate based on notification type
        if (notification.type === 'status_update') {
            // Check if it's a new complaint or status update
            if (safeTitle.includes('Aduan Baru') || safeTitle.includes('New Complaint')) {
                // Try to extract username from backend message: "Aduan baru daripada [Name]. Sila..."
                // More robust regex: Match "daripada " then capture until ". Sila" OR just "."
                const nameMatch = safeMessage.match(/daripada\s+(.*?)(?:\.\s+Sila|\.)/);

                const userName = nameMatch ? nameMatch[1].trim() : 'User';

                return {
                    title: (t('notification.new_complaint_title', { report_number: reportNumber }) || safeTitle) as string,
                    message: (t('notification.new_complaint_msg', { user_name: userName }) || safeMessage) as string
                };
            } else {
                return {
                    title: (t('notification.status_update_title', { report_number: reportNumber || complaintId }) || safeTitle) as string,
                    message: (t('notification.status_update_msg', { report_number: reportNumber || complaintId, status: translatedStatus }) || safeMessage) as string
                };
            }
        } else if (notification.type === 'assignment') {
            return {
                title: (t('notification.job_assigned_title', { report_number: reportNumber || complaintId }) || safeTitle) as string,
                message: (t('notification.job_assigned_msg', { report_number: reportNumber || complaintId }) || safeMessage) as string
            };
        }

        // Match "Status Update [A00015]: Service ..."
        // Regex matches "Complaint is being processed by [Name] on [Date]"
        const statusDetailMatch = safeMessage.match(/Complaint (?:is being processed|was complete repaired) by (.*?) on (.*)/) ||
            safeMessage.match(/Status Update \[([A-Z0-9]+)\]: Service (.*?) by Technician (.*?) on (.*?)\./);

        // Try to extract Report Number from Title "Status Update: A00017"
        const titleMatch = safeTitle.match(/([A-Z][0-9]+)/);
        const reportNo = titleMatch ? titleMatch[1] : (safeMessage.match(/Complaint ([A-Z0-9]+)/)?.[1] || '---');

        if (statusDetailMatch) {
            let techName, dateString;
            const isCompleted = safeMessage.toLowerCase().includes('completed') || safeMessage.toLowerCase().includes('repaired');

            // Handle different regex groups depending on match
            if (statusDetailMatch.length === 3) {
                // New Format: [match, techName, dateString]
                techName = statusDetailMatch[1];
                dateString = statusDetailMatch[2];
            } else {
                // Old Format: [match, report, status, techName, date]
                techName = statusDetailMatch[3];
                dateString = statusDetailMatch[4];
            }

            // Clean date string ". Item ready for pickup." if present
            let cleanDateStr = dateString.replace('. Item ready for pickup.', '').trim();

            // Split Date and Time (Assuming "03 Feb 2026 at 05:42 PM")
            // If "at" exists, split it. If not, use whole string as date.
            const parts = cleanDateStr.split(' at ');
            const dateOnly = parts[0];
            const timeOnly = parts.length > 1 ? parts[1] : '';

            // Use optional chaining with fallback as requested
            const titleText = isCompleted
                ? (t?.('notification.notif_completed_title', { id: reportNo }) || `Status Update: ${reportNo}`) as string
                : (t?.('notification.notif_processing_title', { id: reportNo }) || `Status Update: ${reportNo}`) as string;

            const bodyText = isCompleted
                ? (t?.('notification.notif_completed_body', { id: reportNo, name: techName, date: dateOnly, time: timeOnly }) || safeMessage) as string
                : (t?.('notification.notif_processing_body', { id: reportNo, name: techName, date: dateOnly, time: timeOnly }) || safeMessage) as string;

            return {
                title: titleText,
                message: bodyText
            };
        }

        // Return original if no match, but strip internal data like uid
        return {
            title: safeTitle,
            message: safeMessage.replace(/\buid:[a-zA-Z0-9-]+/, '').trim()
        };
    };

    const fetchNotifications = async () => {
        try {
            const res = await api.get(`/notifications?_t=${new Date().getTime()}`);
            const newUnreadCount = res.data?.unread_count || 0;
            const newNotifications = res.data?.notifications || [];
            const latestNotif = newNotifications.length > 0 ? newNotifications[0] : null;

            setNotifications(newNotifications);
            setUnreadCount(newUnreadCount);

            // Play sound logic
            if (!isFirstLoadRef.current) {
                // Modified: Play sound if unread count increased OR if we see a new ID at the top
                const hasNewCount = newUnreadCount > prevUnreadCountRef.current;
                const hasNewTopId = latestNotif && latestNotif.id !== lastNotificationIdRef.current;

                if (hasNewCount || hasNewTopId) {
                    playNotificationSound();
                    if (!isOpen) setIsOpen(true);
                }
            }

            if (latestNotif) {
                lastNotificationIdRef.current = latestNotif.id;
            }
            prevUnreadCountRef.current = newUnreadCount;
            isFirstLoadRef.current = false;
        } catch (error) {
            console.error('Failed to fetch notifications');
        }
    };

    const fetchNotificationsRef = useRef(fetchNotifications);

    // Update ref to latest function on every render
    useEffect(() => {
        fetchNotificationsRef.current = fetchNotifications;
    });

    useEffect(() => {
        if (fetchNotificationsRef.current) {
            fetchNotificationsRef.current();
        }
        // Poll every 5 seconds (reduced from 10)
        const interval = setInterval(() => {
            if (fetchNotificationsRef.current) {
                fetchNotificationsRef.current();
            }
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }

            // Unlock audio on first interaction
            if (audioRef.current && audioRef.current.paused) {
                // Just try to play and pause immediately to unlock AudioContext if needed
                // But efficient way is just letting the user interaction 'bless' the audio element
                // We'll trust the browser remembers the interaction for subsequent plays
            }
        }
        document.addEventListener('mousedown', handleClickOutside);

        // Add a specialized unlocker for audio
        const unlockAudio = () => {
            if (audioRef.current) {
                audioRef.current.play().then(() => {
                    audioRef.current?.pause();
                    audioRef.current!.currentTime = 0;
                    document.removeEventListener('click', unlockAudio);
                    document.removeEventListener('keydown', unlockAudio);
                }).catch(e => console.log('Audio unlock failed (normal if already unlocked or no interaction yet)', e));
            }
        };

        document.addEventListener('click', unlockAudio);
        document.addEventListener('keydown', unlockAudio);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
        };
    }, []);

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

        setIsOpen(false);

        // Check for embedded UID in message (format: | uid:UUID or \nuid:UUID or just uid:UUID)
        const uidMatch = notification.message.match(/\buid:([a-zA-Z0-9-]+)/);
        if (uidMatch) {
            navigate(`/admin/users/${uidMatch[1]}`);
            return;
        }

        // Check if this is a profile/password notification
        const isProfileOrPassword = notification.title.includes('Profil') || notification.title.includes('Kata Laluan') ||
            notification.title.includes('Profile') || notification.title.includes('Password');

        // Check if reference_id is valid (not 0 or null)
        const hasValidReferenceId = notification.reference_id && notification.reference_id > 0;

        // Resolve numeric reference_id to report_number
        const resolveAndNavigate = async (basePath: string) => {
            if (!hasValidReferenceId) {
                navigate(basePath);
                return;
            }
            try {
                const { data } = await api.get(`/complaints/resolve-id/${notification.reference_id}`);
                const reportNumber = data.report_number;
                if (path.startsWith('/users')) {
                    navigate(`/users/complaint/${reportNumber}`);
                } else if (path.startsWith('/admin/technician')) {
                    navigate(`/admin/technician/complaint/${reportNumber}`);
                } else {
                    navigate(`/admin/complaint/${reportNumber}`);
                }
            } catch {
                // Fallback to the base list page if resolution fails
                navigate(basePath);
            }
        };

        // Navigate based on current path context
        const path = window.location.pathname;
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

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 relative transition-colors"
                title="Notifications"
            >
                <Bell className={`w-6 h-6 ${unreadCount > 0 ? 'text-indigo-600' : 'text-gray-500'}`} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full ring-2 ring-white animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="fixed inset-x-2 top-auto sm:absolute sm:inset-x-auto sm:top-full sm:right-0 mt-2 sm:w-80 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
                    <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                        <h3 className="font-semibold text-gray-700 text-sm">{t('common.notifications')}</h3>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    playNotificationSound();
                                }}
                                className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1"
                                title="Test Sound"
                            >
                                <span>🔊</span> Test
                            </button>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                    {t('common.mark_all_read')}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                {t('common.no_notifications')}
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.slice(0, 5).map((notification) => {
                                    const translated = getTranslatedNotification(notification);
                                    return (
                                        <div
                                            key={notification.id}
                                            onClick={() => handleClickNotification(notification)}
                                            className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.is_read ? 'bg-blue-50/50' : ''}`}
                                        >
                                            <div className="flex gap-3">
                                                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!notification.is_read ? 'bg-indigo-500' : 'bg-transparent'}`} />
                                                <div>
                                                    <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                                                        {translated.title}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">
                                                        {translated.message}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-2">
                                                        {(() => {
                                                            if (!notification.created_at) return '';
                                                            
                                                            const date = new Date(notification.created_at);
                                                            if (isNaN(date.getTime())) return ''; // Check for invalid date

                                                            const isMalay = i18n.language === 'ms';
                                                            const locale = isMalay ? 'ms-MY' : 'en-US';

                                                            const dateStr = date.toLocaleDateString(locale, {
                                                                day: 'numeric',
                                                                month: 'long',
                                                                year: 'numeric'
                                                            });

                                                            let timeStr = date.toLocaleTimeString(locale, {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                hour12: true
                                                            });

                                                            if (isMalay) {
                                                                timeStr = timeStr
                                                                    .replace('AM', 'PG')
                                                                    .replace('PM', 'PTG');
                                                            }

                                                            return `${dateStr}, ${timeStr}`;
                                                        })()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* View All button */}
                    <div className="p-2 border-t border-gray-100 bg-gray-50">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                const path = window.location.pathname;
                                if (path.startsWith('/users')) {
                                    navigate('/users/notifications');
                                } else if (path.startsWith('/admin/technician')) {
                                    navigate('/admin/technician/notifications');
                                } else {
                                    navigate('/admin/notifications');
                                }
                            }}
                            className="w-full text-center text-sm text-indigo-600 hover:text-indigo-800 font-medium py-1.5 rounded hover:bg-indigo-50 transition-colors"
                        >
                            {t('common.view_all')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
