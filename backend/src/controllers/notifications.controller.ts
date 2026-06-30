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
                notif_processing_user: "{{user_name}}, aduan {{id}} anda telah diproses oleh juruteknik {{name}}.\n\nSila klik butang di bawah untuk lihat status semasa aduan kerosakan barang anda.",
                notif_processing_user_body: "Status Terkini: Aduan anda {{id}} kini DALAM PROSES oleh juruteknik {{name}} pada {{date}} jam {{time}}.",
                notif_processing_tech_body: "Anda telah ditugaskan untuk menyemak aduan {{id}} daripada {{userName}}.",
                notif_transport_admin: "Update Transport: {{id}} - Kenderaan/Logistik dikemaskini oleh Technician. Butiran: {{detail}}",
                notif_transport_user: "Info Transport: Status logistik untuk aduan {{id}} anda telah dikemaskini. Butiran: {{detail}}",
                notif_checking_admin: "Semakan Teknikal: {{id}} telah diperiksa. Penemuan teknikal: {{detail}}",
                notif_checking_user: "Status Semakan: Juruteknik kami telah selesai membuat pemeriksaan pada {{id}}. Penemuan: {{detail}}",
                notif_remark_admin: "Nota Baru: {{id}} mempunyai ulasan tambahan daripada Technician: {{detail}}",
                notif_remark_user: "Kemas kini Aduan: Terdapat nota baru mengenai status aduan {{id}} anda: {{detail}}",
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
                template = template.replace(new RegExp(`{{${p}}}`, 'g'), String(val !== undefined && val !== null ? val : ''));
            });

            // Clean up any remaining unresolved placeholders
            template = template.replace(/\{\{[a-zA-Z0-9_-]+\}\}/g, '');

            return template;
        }
    } catch (e) {
        // Not a JSON payload, return the plain string as is
    }
    return payload;
};

// Helper to translate detailed status messages (English strings from backend status updates) to custom Malay wording
const translateDetailedMessage = (msg: string, userName: string, branchName: string): string => {
    // 1. Processing (In Process) - Format A
    const procRegexA = /Status Update:\s+Complaint\s+([A-Z0-9]+)\s+is being processed by technician\s+(.*?)\s+at\s+([^.]+)/i;
    const procMatchA = msg.match(procRegexA);
    if (procMatchA) {
        const reportNo = procMatchA[1];
        const techName = procMatchA[2];
        return `${userName}, aduan ${reportNo} anda telah diproses oleh juruteknik ${techName}.\n\nSila klik butang di bawah untuk lihat status semasa aduan kerosakan barang anda.`;
    }

    // 1b. Processing (In Process) - Format B
    const procRegexB = /Status Update\s+\[([A-Z0-9]+)\]:\s+Service\s+(?:in\s+)?process\s+by\s+Technician\s+(.*?)\s+on\s+([^.]+)/i;
    const procMatchB = msg.match(procRegexB);
    if (procMatchB) {
        const reportNo = procMatchB[1];
        const techName = procMatchB[2];
        return `${userName}, aduan ${reportNo} anda telah diproses oleh juruteknik ${techName}.\n\nSila klik butang di bawah untuk lihat status semasa aduan kerosakan barang anda.`;
    }

    // 2. Completed (Closed) - Format A
    const compRegexA = /Status Update:\s+Complaint\s+([A-Z0-9]+)\s+is now completed by technician\s+(.*?)\s+at\s+([^.]+)\.\s+Ready for pickup\./i;
    const compMatchA = msg.match(compRegexA);
    if (compMatchA) {
        const reportNo = compMatchA[1];
        const techName = compMatchA[2];
        return `Aduan ${reportNo} anda telah siap dibaiki oleh juruteknik ${techName}.\nBarang anda boleh diambil di cawangan ${branchName}.\n\nSila klik butang di bawah untuk lihat status barangan anda sudah sedia untuk diambil.`;
    }

    // 2b. Completed (Closed) - Format B
    const compRegexB = /Status Update\s+\[([A-Z0-9]+)\]:\s+Service\s+completed\s+by\s+Technician\s+(.*?)\s+on\s+([^.]+)\.\s+Case status transitioned to 'Ready for Pickup'\./i;
    const compMatchB = msg.match(compRegexB);
    if (compMatchB) {
        const reportNo = compMatchB[1];
        const techName = compMatchB[2];
        return `Aduan ${reportNo} anda telah siap dibaiki oleh juruteknik ${techName}.\nBarang anda boleh diambil di cawangan ${branchName}.\n\nSila klik butang di bawah untuk lihat status barangan anda sudah sedia untuk diambil.`;
    }

    return msg;
};

// HTML Email Notification Template (Blue & White Theme)
export const buildNotificationEmailHtml = (name: string, title: string, message: string, reportNumber?: string, role?: string) => {
    let baseUrl = 'https://pta-ecare.vercel.app';
    if (process.env.FRONTEND_URL) {
        baseUrl = process.env.FRONTEND_URL.replace(/\/$/, ''); // Remove trailing slash if any
    }
    
    let linkUrl = baseUrl;
    let buttonText = 'Buka Portal E-CARE';
    
    switch (role) {
        case 'user':
            if (reportNumber) {
                linkUrl = `${baseUrl}/users/complaint/${reportNumber}`;
            } else {
                linkUrl = `${baseUrl}/users/complaint-history`;
            }
            
            if (message.includes('siap dibaiki')) {
                buttonText = 'Lihat Status Barangan';
            } else if (message.includes('telah diproses')) {
                buttonText = 'Lihat Status Semasa';
            } else {
                buttonText = 'Semak Progress Aduan';
            }
            break;
        case 'technician':
            if (reportNumber) {
                linkUrl = `${baseUrl}/admin/technician/complaint/${reportNumber}`;
            } else {
                linkUrl = `${baseUrl}/admin/technician/complaints`;
            }
            buttonText = 'Semak Tugasan Aduan';
            break;
        case 'admin':
            if (reportNumber) {
                linkUrl = `${baseUrl}/admin/complaint/${reportNumber}`;
            } else {
                linkUrl = `${baseUrl}/admin/complaints`;
            }
            buttonText = 'Semak Aduan';
            break;
        default:
            linkUrl = baseUrl;
            buttonText = 'Buka Portal E-CARE';
    }

    return `<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 40px 0; width: 100%;">
        <div style="max-width: 600px; background-color: #ffffff; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; padding: 40px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; letter-spacing: 1px; text-transform: uppercase; color: #ffffff;">e-Care</h1>
                <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9; color: #ffffff;">Powered by DFKTVETMARABESUT</p>
            </div>
            <div style="padding: 40px; line-height: 1.6; color: #334155;">
                <h2 style="color: #1e293b; margin-top: 0; font-size: 20px;">${title}</h2>
                <p>Hi <strong>${name}</strong>,</p>
                <div style="margin: 20px 0; color: #334155; font-size: 15px;">
                    ${message.replace(/\n/g, '<br />')}
                </div>
                ${role !== 'no_link' ? `
                <div style="text-align: center; margin: 35px 0;">
                    <a href="${linkUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                        ${buttonText}
                    </a>
                </div>
                ` : ''}
                
                <div style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;"></div>
                <p style="font-size: 11px; color: #94a3b8; margin: 0;">Hantaran automatik sistem e-Care. Sila abaikan jika anda tersilap menerima emel ini.</p>
            </div>
            <div style="background-color: #f1f5f9; padding: 30px; text-align: center; font-size: 12px; color: #64748b;">
                <p style="margin: 0 0 5px 0;">© 2026 <strong style="color: #1e3a8a;">DFKTVETMARABESUT</strong>. Hak cipta terpelihara.</p>
                <p style="margin: 0;">Besut, Terengganu, Malaysia</p>
            </div>
        </div>
    </div>
</body>
</html>`;
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
                // Ensure all notifications for admin role go to adminecare.ptasssb@gmail.com
                email = 'adminecare.ptasssb@gmail.com';
                name = adminProfile?.admin_name || 'Administrator';
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
                let reportNumber = '';
                let branchName = 'cawangan asal aduan';
                
                if (complaint_id) {
                    const { data: complaintData } = await supabaseAdmin
                        .from('complaints')
                        .select('state, report_number')
                        .eq('id', complaint_id)
                        .single();
                    if (complaintData) {
                        if (complaintData.state) branchName = complaintData.state;
                        if (complaintData.report_number) reportNumber = complaintData.report_number;
                    }
                }
                
                let parsedPayload = payload;
                try {
                    const parsed = JSON.parse(payload);
                    if (parsed && typeof parsed === 'object') {
                        if (!parsed.params) parsed.params = {};
                        parsed.params.user_name = name || 'Pengguna';
                        parsedPayload = JSON.stringify(parsed);
                    }
                } catch (e) {
                    // Not JSON, ignore
                }

                let humanReadableMessage = translateMessage(parsedPayload);
                
                if (role === 'user' && (type === 'status_update_detailed' || type === 'status_update')) {
                    humanReadableMessage = translateDetailedMessage(humanReadableMessage, name || 'Pengguna', branchName);
                }
                
                // Format Subject according to user specification
                let emailSubject = `e-Care: ${start_msg}`;
                if (reportNumber) {
                    if (start_msg.includes('Aduan Berjaya Didaftarkan')) {
                        emailSubject = `${reportNumber} Aduan Berjaya Didaftarkan`;
                    } else if (start_msg.includes('Status Update')) {
                        emailSubject = `Status Update: ${reportNumber}`;
                    }
                }
                
                const emailHtml = buildNotificationEmailHtml(name || 'Pengguna', emailSubject, humanReadableMessage, reportNumber, role);
                await sendEmail(email, emailSubject, emailHtml);
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
