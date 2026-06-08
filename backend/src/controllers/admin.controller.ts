import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { supabaseAdmin } from '../config/supabase.js';
import { buildActivationEmail } from './auth.controller.js';
import { sendEmail } from '../utils/email.js';

// Get dashboard statistics
export const getStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { data: allComplaints, error } = await supabaseAdmin
            .from('complaints')
            .select('id, status, assigned_to');

        if (error) throw error;

        const stats = {
            total: allComplaints?.length || 0,
            pending: 0,
            in_process: 0,
            closed: 0,
            not_forwarded: 0,
            cancelled: 0,
        };

        (allComplaints || []).forEach((c: any) => {
            if (c.status === 'pending') stats.pending++;
            if (c.status === 'in_process') stats.in_process++;
            if (c.status === 'closed') stats.closed++;
            if (c.status === 'cancelled') stats.cancelled++;
            if (c.status === 'pending' && !c.assigned_to) stats.not_forwarded++;
        });

        res.json({ stats });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get technician statistics
export const getTechnicianStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { data: technicians, error } = await supabaseAdmin
            .from('technicians')
            .select('id, name, department')
            .eq('is_active', true);

        if (error) throw error;

        if (!technicians || technicians.length === 0) {
            res.json({ technicianStats: [] });
            return;
        }

        const technicianStats = await Promise.all(
            technicians.map(async (tech: any) => {
                const { data: complaints } = await supabaseAdmin
                    .from('complaints')
                    .select('status')
                    .eq('assigned_to', tech.id);

                const stats = {
                    technician_id: tech.id,
                    technician_name: tech.name,
                    department: tech.department,
                    total: complaints?.length || 0,
                    pending: 0,
                    in_process: 0,
                    closed: 0,
                };

                (complaints || []).forEach((c: any) => {
                    if (c.status === 'pending') stats.pending++;
                    if (c.status === 'in_process') stats.in_process++;
                    if (c.status === 'closed') stats.closed++;
                });

                return stats;
            })
        );

        res.json({ technicianStats });
    } catch (error) {
        console.error('Get technician stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get single technician
export const getTechnician = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseAdmin
            .from('technicians')
            .select('id, name, department, email, contact_number, username, is_active, created_at')
            .eq('id', id)
            .single();

        if (error || !data) {
            res.status(404).json({ error: 'Technician not found' });
            return;
        }

        res.json({ technician: data });
    } catch (error) {
        console.error('Get technician error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all technicians
export const getTechnicians = async (req: Request, res: Response): Promise<void> => {
    try {
        const { data, error } = await supabaseAdmin
            .from('technicians')
            .select('id, name, department, email, contact_number, username, is_active, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ technicians: data || [] });
    } catch (error) {
        console.error('Get technicians error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create technician
export const createTechnician = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, department, email, contact_number, username, password } = req.body;

        // Check if username or email already exists
        const { data: existingUser } = await supabaseAdmin
            .from('technicians')
            .select('id')
            .eq('username', username);

        const { data: existingEmail } = await supabaseAdmin
            .from('technicians')
            .select('id')
            .eq('email', email);

        if ((existingUser && existingUser.length > 0) || (existingEmail && existingEmail.length > 0)) {
            res.status(400).json({ error: 'Username or email already exists' });
            return;
        }

        const password_hash = await bcrypt.hash(password, 10);

        // Insert technician as inactive (is_active: false)
        const { data: newTech, error } = await supabaseAdmin
            .from('technicians')
            .insert({ name, department, email, contact_number, username, password_hash, is_active: false })
            .select()
            .single();

        if (error) throw error;

        // Generate 6-digit OTP code
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

        // Delete any existing OTP for this email and role
        await supabaseAdmin
            .from('activation_otps')
            .delete()
            .eq('email', email)
            .eq('role', 'technician');

        // Insert new OTP record
        const { error: otpError } = await supabaseAdmin
            .from('activation_otps')
            .insert({
                email,
                role: 'technician',
                otp,
                expires_at: expiresAt
            });

        if (otpError) {
            console.error('Failed to save activation OTP:', otpError);
        } else {
            // Send activation email
            try {
                const activationHtml = buildActivationEmail(name, otp, 'technician');
                await sendEmail(email, 'Aktifkan Akaun Juruteknik eCare Anda', activationHtml);
            } catch (emailError) {
                console.error('Failed to send technician activation email:', emailError);
            }
        }

        const { password_hash: _, ...techWithoutPassword } = newTech;
        res.status(201).json({ message: 'Technician created successfully and activation OTP email sent.', technician: techWithoutPassword });
    } catch (error) {
        console.error('Create technician error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update technician
export const updateTechnician = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, department, email, contact_number, is_active } = req.body;

        const updates: any = { updated_at: new Date().toISOString() };
        if (name !== undefined) updates.name = name;
        if (department !== undefined) updates.department = department;
        if (email !== undefined) updates.email = email;
        if (contact_number !== undefined) updates.contact_number = contact_number;
        if (is_active !== undefined) updates.is_active = is_active;

        const { data, error } = await supabaseAdmin
            .from('technicians')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        const { password_hash, ...techWithoutPassword } = data;
        res.json({ message: 'Technician updated', technician: techWithoutPassword });
    } catch (error) {
        console.error('Update technician error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Reset technician password
export const resetTechnicianPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;

        const password_hash = await bcrypt.hash(new_password, 10);

        const { error } = await supabaseAdmin
            .from('technicians')
            .update({ password_hash, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete technician
export const deleteTechnician = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('technicians')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Technician deleted' });
    } catch (error) {
        console.error('Delete technician error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get single user
export const getUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const { password_hash, ...userWithoutPassword } = data;
        res.json({ user: userWithoutPassword });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all users
export const getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { page = 1, limit = 10, search, status } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const offset = (pageNum - 1) * limitNum;

        let query = supabaseAdmin
            .from('users')
            .select('id, full_name, ic_number, email, contact_no, address, state, status, created_at', { count: 'exact' });

        if (status && status !== 'all') {
            query = query.eq('status', status as string);
        }

        if (search) {
            query = query.or(`full_name.ilike.%${search}%,ic_number.ilike.%${search}%,email.ilike.%${search}%`);
        }

        query = query.order('created_at', { ascending: false }).range(offset, offset + limitNum - 1);

        const { data, count, error } = await query;

        if (error) throw error;

        const total = count || 0;
        res.json({
            users: data || [],
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update user status
export const updateUserStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const { data, error } = await supabaseAdmin
            .from('users')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ message: 'User status updated', user: data });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get admin/technician profile
export const getAdminProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const role = (req as any).user.role;

        const table = role === 'technician' ? 'technicians' : 'admins';
        console.log(`Fetching ${role} profile for ${userId}`);

        const { data, error } = await supabaseAdmin
            .from(table)
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !data) {
            res.status(404).json({ error: 'Profile not found' });
            return;
        }

        res.json(data);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update admin/technician profile
export const updateAdminProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const role = (req as any).user.role;
        const { username, email } = req.body;

        if (!username || !username.trim()) {
            res.status(400).json({ error: 'Username is required' });
            return;
        }

        const table = role === 'technician' ? 'technicians' : 'admins';

        // Check if username already exists for another user
        const { data: existing } = await supabaseAdmin
            .from(table)
            .select('id')
            .eq('username', username.trim())
            .neq('id', userId);

        if (existing && existing.length > 0) {
            res.status(400).json({ error: 'Username already taken' });
            return;
        }

        const { data, error } = await supabaseAdmin
            .from(table)
            .update({ username: username.trim(), email: email?.trim() || null, updated_at: new Date().toISOString() })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        res.json({ message: 'Profile updated successfully', user: data });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update admin/technician password
export const updateAdminPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const role = (req as any).user.role;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({ error: 'Current password and new password are required' });
            return;
        }

        if (newPassword.length < 6) {
            res.status(400).json({ error: 'New password must be at least 6 characters' });
            return;
        }

        const table = role === 'technician' ? 'technicians' : 'admins';

        const { data: userRow, error: fetchError } = await supabaseAdmin
            .from(table)
            .select('password_hash')
            .eq('id', userId)
            .single();

        if (fetchError || !userRow) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const isValid = await bcrypt.compare(currentPassword, userRow.password_hash);
        if (!isValid) {
            res.status(400).json({ error: 'Current password is incorrect' });
            return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const { error } = await supabaseAdmin
            .from(table)
            .update({ password_hash: hashedPassword, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) throw error;
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
