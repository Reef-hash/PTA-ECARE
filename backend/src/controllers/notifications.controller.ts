import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

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
        console.log('[CREATE NOTIFICATION] Success');
    } catch (error) {
        console.error('Failed to create notification:', error);
    }
};
