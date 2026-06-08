import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { sendEmail } from '../utils/email.js';

// Get notifications for the logged-in user
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const role = (req as any).user.role;

        console.log(`[NOTIFICATIONS] Fetching for user: ${userId}, role: ${role}`);

        const { data, error } = await supabaseAdmin
            .from('notifications')
            .select('*')
            .eq('recipient_id', userId)
            .eq('recipient_role', role)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        console.log(`[NOTIFICATIONS] Found ${data?.length || 0} notifications`);

        // Count unread
        const { count, error: countError } = await supabaseAdmin
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('recipient_id', userId)
            .eq('recipient_role', role)
            .eq('is_read', false);

        if (countError) throw countError;

        res.json({
            notifications: data || [],
            unread_count: count || 0
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Mark as read
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const role = (req as any).user.role;
        const { id } = req.params;

        if (id === 'all') {
            const { error } = await supabaseAdmin
                .from('notifications')
                .update({ is_read: true })
                .eq('recipient_id', userId)
                .eq('recipient_role', role)
                .eq('is_read', false);

            if (error) throw error;
        } else {
            const { error } = await supabaseAdmin
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id)
                .eq('recipient_id', userId)
                .eq('recipient_role', role);

            if (error) throw error;
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
};

// Helper to parse and translate notification message payloads from JSON to human-readable Malay
const translateMessage = (payload: string): string => {
    try {
        const parsed = JSON.parse(payload);
        if (parsed && typeof parsed === 'object' && parsed.key) {
            const key = parsed.key;
            let params = parsed.params || {};

            const templates: Record<string, string> = {
                new_complaint_msg: "Aduan baru daripada {{user_name}}. Sila semak dan proses.",
                status_update_msg: "Kemaskini Status: Aduan {{report_number}} kini {{status}}.",
                job_assigned_msg: "Anda telah diagihkan aduan baru {{report_number}}",
                user_complaint_created_msg: "Aduan anda {{report_number}} berjaya dibuat. Sila tekan link di bawah untuk lihat progress aduan dan status semasa.",
                user_status_updated_msg: "Aduan anda {{report_number}} telah dikemaskini kepada '{{status}}'. Sila semak butiran di portal.",
                notif_processing_body: "Status Terkini: Aduan {{id}} sedang diproses oleh juruteknik {{name}} pada {{date}} jam {{time}}.",
                notif_completed_body: "Aduan {{id}} telah disiapkan oleh juruteknik {{name}} pada {{date}} jam {{time}}. Sedia untuk diambil.",
                notif_new_job: "Tugasan Baru: {{id}}",
                notif_processing_user_body: "Status Terkini: Aduan anda {{id}} kini DALAM PROSES oleh juruteknik {{name}} pada {{date}} jam {{time}}.",
                notif_processing_tech_body: "Anda telah ditugaskan untuk menyemak aduan {{id}} daripada {{userName}}.",
                notif_transport_admin: "Update Transport: {{id}} - Kenderaan/Logistik dikemaskini oleh Technician.",
                notif_transport_user: "Info Transport: Status logistik untuk aduan {{id}} anda telah dikemaskini.",
                notif_checking_admin: "Semakan Teknikal: {{id}} telah diperiksa. Sila semak penemuan teknikal.",
                notif_checking_user: "Status Semakan: Juruteknik kami telah selesai membuat pemeriksaan pada {{id}}.",
                notif_remark_admin: "Nota Baru: {{id}} mempunyai ulasan tambahan daripada Technician.",
                notif_remark_user: "Kemas kini Aduan: Terdapat nota baru mengenai status aduan {{id}} anda.",
                service_in_process: "Servis sedang diproses oleh Juruteknik {{tech_name}} pada {{date}}.",
                service_completed: "Servis telah disiapkan oleh Juruteknik {{tech_name}} pada {{date}}. Status kes bertukar kepada 'Sedia untuk Diambil'."
            };

            let template = templates[key] || key;

            Object.keys(params).forEach(p => {
                let val = params[p];
                if (p === 'status') {
                    if (val === 'pending') val = 'Menunggu';
                    if (val === 'in_process') val = 'Dalam Proses';
                    if (val === 'closed') val = 'Selesai';
                    if (val === 'cancelled') val = 'Dibatalkan';
                }
                template = template.replace(new RegExp(`{{${p}}}`, 'g'), String(val));
            });

            return template;
        }
    } catch (e) {
        // Not a JSON payload, return the plain string as is
    }
    return payload;
};

// HTML Email Notification Template (Blue & White Theme)
export const buildNotificationEmailHtml = (name: string, title: string, message: string, complaintId?: number, role?: string) => {
    let baseUrl = 'https://pta-ecare.vercel.app';
    if (process.env.FRONTEND_URL) {
        baseUrl = process.env.FRONTEND_URL.replace(/\/$/, ''); // Remove trailing slash if any
    }
    
    let linkUrl = baseUrl;
    let buttonText = 'Buka Portal E-CARE';
    
    switch (role) {
        case 'user':
            if (complaintId) {
                linkUrl = `${baseUrl}/users/complaint/${complaintId}`;
            } else {
                linkUrl = `${baseUrl}/users/complaint-history`;
            }
            buttonText = 'Semak Progress Aduan';
            break;
        case 'technician':
            if (complaintId) {
                linkUrl = `${baseUrl}/admin/technician/complaint/${complaintId}`;
            } else {
                linkUrl = `${baseUrl}/admin/technician/complaints`;
            }
            buttonText = 'Semak Tugasan Aduan';
            break;
        case 'admin':
            if (complaintId) {
                linkUrl = `${baseUrl}/admin/complaint/${complaintId}`;
            } else {
                linkUrl = `${baseUrl}/admin/complaints`;
            }
            buttonText = 'Semak Aduan';
            break;
        default:
            linkUrl = baseUrl;
            buttonText = 'Buka Portal E-CARE';
    }

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
        <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; padding: 25px 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">E-CARE</h1>
                <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">Sistem Pengurusan Servis & Aduan</p>
            </div>
            <div style="padding: 30px;">
                <h2 style="color: #1e3a8a; margin-top: 0; font-size: 18px;">${title}</h2>
                <p>Hi <strong>${name}</strong>,</p>
                <p>Anda mempunyai notifikasi baharu berkenaan aduan/servis anda:</p>
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0; color: #475569;">
                    ${message.replace(/\n/g, '<br />')}
                </div>
                <p>Sila klik butang di bawah untuk melihat butiran lanjut:</p>
                <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
                    <a href="${linkUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                        ${buttonText}
                    </a>
                </div>
            </div>
        </div>
    </div>
    `;
};

// Internal helper to create notification
export const createNotification = async (
    userId: string | number,
    role: 'user' | 'admin' | 'technician',
    start_msg: string,
    payload: string,
    type: 'assignment' | 'status_update' | 'status_update_detailed' | 'transport_update' | 'checking_update' | 'remark_update' | 'system' = 'status_update',
    complaint_id?: number
): Promise<void> => {
    try {
        console.log(`[CREATE NOTIFICATION] recipientId: ${userId}, recipientRole: ${role}, title: ${start_msg}, referenceId: ${complaint_id}`);

        // 1. Create DB notification for loceng bell
        const { error } = await supabaseAdmin
            .from('notifications')
            .insert({
                recipient_id: userId,
                recipient_role: role,
                title: start_msg,
                message: payload,
                type,
                reference_id: complaint_id || null,
                is_read: false
            });

        if (error) throw error;
        console.log('[CREATE NOTIFICATION] Bell DB notification created successfully');

        // 2. Fetch email and send custom HTML transaction email in a safe background task
        try {
            let email = '';
            let name = '';

            if (role === 'user') {
                const { data: userProfile } = await supabaseAdmin
                    .from('users')
                    .select('email, full_name')
                    .eq('id', userId)
                    .single();
                if (userProfile) {
                    email = userProfile.email || '';
                    name = userProfile.full_name || '';
                }
            } else if (role === 'admin') {
                const { data: adminProfile } = await supabaseAdmin
                    .from('admins')
                    .select('email, admin_name')
                    .eq('id', userId)
                    .single();
                if (adminProfile) {
                    email = adminProfile.email || '';
                    name = adminProfile.admin_name || '';
                }
            } else if (role === 'technician') {
                const { data: techProfile } = await supabaseAdmin
                    .from('technicians')
                    .select('email, name')
                    .eq('id', userId)
                    .single();
                if (techProfile) {
                    email = techProfile.email || '';
                    name = techProfile.name || '';
                }
            }

            if (email) {
                const humanReadableMessage = translateMessage(payload);
                const emailHtml = buildNotificationEmailHtml(name || 'Pengguna', start_msg, humanReadableMessage, complaint_id, role);
                await sendEmail(email, `eCare: ${start_msg}`, emailHtml);
                console.log(`[CREATE NOTIFICATION] Email sent successfully to ${email}`);
            } else {
                console.log(`[CREATE NOTIFICATION] No email found for user: ${userId}, role: ${role}`);
            }
        } catch (emailErr) {
            console.error('[CREATE NOTIFICATION] Failed to fetch profile or send email:', emailErr);
        }
    } catch (error) {
        console.error('Failed to create notification:', error);
    }
};
