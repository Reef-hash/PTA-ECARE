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

// HTML Email Notification Template (Blue & White Theme)
const buildNotificationEmailHtml = (name: string, title: string, message: string) => `
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
                <p>Sila log masuk ke portal E-CARE anda untuk melihat butiran lanjut.</p>
                <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
                    <a href="${process.env.FRONTEND_URL || 'https://pta-ecare.vercel.app'}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                        Buka Portal E-CARE
                    </a>
                </div>
            </div>
        </div>
    </div>
`;

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
                const emailHtml = buildNotificationEmailHtml(name || 'Pengguna', start_msg, payload);
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
