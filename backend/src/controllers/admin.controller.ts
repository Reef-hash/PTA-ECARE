import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { supabaseAdmin } from '../config/supabase.js';
import { buildActivationEmail } from './auth.controller.js';
import { sendEmail, isEmailAllowed } from '../utils/email.js';
import { buildNotificationEmailHtml } from './notifications.controller.js';

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
            assigned: 0,
            cancelled: 0,
            incomplete: 0,
        };

        (allComplaints || []).forEach((c: any) => {
            if (c.status === 'pending') stats.pending++;
            if (c.status === 'in_process') stats.in_process++;
            if (c.status === 'closed') stats.closed++;
            if (c.status === 'cancelled') stats.cancelled++;
            if (c.status === 'incomplete') stats.incomplete++;
            if (c.status === 'pending' && !c.assigned_to) stats.not_forwarded++;
            if (c.status === 'pending' && c.assigned_to) stats.assigned++;
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

        if (email && !(await isEmailAllowed(email))) {
            res.status(400).json({ error: 'Sila gunakan alamat e-mel yang sah. Domain e-mel ini tidak dibenarkan.' });
            return;
        }

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
                await sendEmail(email, 'Aktifkan Akaun Juruteknik e-Care Anda', activationHtml);
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

        if (email && !(await isEmailAllowed(email))) {
            res.status(400).json({ error: 'Sila gunakan alamat e-mel yang sah. Domain e-mel ini tidak dibenarkan.' });
            return;
        }

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

        // Fetch technician details to get email & name
        const { data: techRow, error: fetchError } = await supabaseAdmin
            .from('technicians')
            .select('email, name, username')
            .eq('id', id)
            .single() as any;

        if (fetchError || !techRow) {
            res.status(404).json({ error: 'Technician not found' });
            return;
        }

        const { error } = await supabaseAdmin
            .from('technicians')
            .update({ password_hash, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;

        // Send email notification to technician
        if (techRow.email) {
            try {
                const subject = 'Kata Laluan Juruteknik e-Care Berjaya Ditukar';
                const message = `Anda telah menukar kata laluan baharu: ${new_password}\n\nSila ingat dan simpan dengan baik`;
                const emailHtml = buildNotificationEmailHtml(
                    techRow.name || techRow.username || 'Juruteknik',
                    subject,
                    message,
                    undefined,
                    'no_link'
                );
                await sendEmail(techRow.email, subject, emailHtml);
                console.log(`Password reset notification sent to technician: ${techRow.email}`);
            } catch (emailErr) {
                console.error('Failed to send technician password reset notification email:', emailErr);
            }
        }

        // Send email notification to admin at adminecare.ptasssb@gmail.com
        try {
            const adminEmail = 'adminecare.ptasssb@gmail.com';
            const subject = 'Notifikasi Penetapan Semula Kata Laluan Juruteknik';
            const message = `Anda telah berjaya menetapkan semula kata laluan baharu untuk Juruteknik <strong>${techRow.name || techRow.username}</strong>.\n\nKata Laluan Baharu: ${new_password}`;
            const emailHtml = buildNotificationEmailHtml(
                'Admin',
                subject,
                message,
                undefined,
                'no_link'
            );
            await sendEmail(adminEmail, subject, emailHtml);
            console.log(`Password reset notification sent to admin: ${adminEmail}`);
        } catch (adminEmailErr) {
            console.error('Failed to send admin password reset notification email:', adminEmailErr);
        }

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

        const { password_hash, password_plain, ...userRest } = data;
        res.json({ user: { ...userRest, password: password_plain || null } });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete single user
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', id);

        // Best effort delete from Supabase Auth
        await supabaseAdmin.auth.admin.deleteUser(id).catch(e => console.error('Auth delete user error (ignored):', e));

        if (error) {
            if (error.code === '23503') { // Foreign key constraint violation
                res.status(400).json({ error: 'Tidak boleh padam pengguna ini kerana mereka mempunyai rekod aduan yang berkaitan.' });
                return;
            }
            throw error;
        }

        res.json({ message: 'User deleted' });
    } catch (error) {
        console.error('Delete user error:', error);
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

        if (email && !(await isEmailAllowed(email))) {
            res.status(400).json({ error: 'Sila gunakan alamat e-mel yang sah. Domain e-mel ini tidak dibenarkan.' });
            return;
        }

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

        const { data: userRow, error: fetchError } = await (role === 'technician'
            ? supabaseAdmin.from('technicians').select('password_hash, email, name, username').eq('id', userId).single()
            : supabaseAdmin.from('admins').select('password_hash').eq('id', userId).single()
        ) as any;

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

        const { error: updateError } = await supabaseAdmin
            .from(table)
            .update({ password_hash: hashedPassword, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (updateError) throw updateError;

        // Send email notification ONLY for technicians
        if (role === 'technician' && userRow.email) {
            try {
                const subject = 'Kata Laluan Juruteknik e-Care Berjaya Ditukar';
                const message = `Anda telah menukar kata laluan baharu: ${newPassword}\n\nSila ingat dan simpan dengan baik`;
                const emailHtml = buildNotificationEmailHtml(
                    userRow.name || userRow.username || 'Juruteknik',
                    subject,
                    message,
                    undefined,
                    'no_link'
                );
                await sendEmail(userRow.email, subject, emailHtml);
                console.log(`Password change notification sent to technician: ${userRow.email}`);
            } catch (emailErr) {
                console.error('Failed to send technician password change notification email:', emailErr);
            }
        }

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create user (admin registers customer account)
export const createUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { full_name, ic_number, email, contact_no, contact_no_2, address, state, password } = req.body;

        const normalizedEmail = email ? email.trim().toLowerCase() : '';

        // Validate email domain if provided
        if (normalizedEmail && !(await isEmailAllowed(normalizedEmail))) {
            res.status(400).json({ error: 'Sila gunakan alamat e-mel yang sah. Domain e-mel ini tidak dibenarkan.' });
            return;
        }

        // Check IC number duplicate
        const { data: existingIC } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('ic_number', ic_number);

        if (existingIC && existingIC.length > 0) {
            res.status(400).json({ error: 'No IC ini telah didaftarkan.' });
            return;
        }

        // Check email duplicate (if provided)
        if (normalizedEmail) {
            const { data: existingEmail } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', normalizedEmail);

            if (existingEmail && existingEmail.length > 0) {
                res.status(400).json({ error: 'E-mel ini telah didaftarkan oleh pengguna lain.' });
                return;
            }
        }

        const password_hash = await bcrypt.hash(password, 10);
        let userId: string;

        if (normalizedEmail) {
            // With email: create Supabase Auth user
            const { data: authResult, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: normalizedEmail,
                password,
                email_confirm: true,
                user_metadata: {
                    full_name,
                    ic_number,
                    contact_no,
                    address
                }
            });

            if (authError || !authResult.user) {
                const msg = authError?.message || '';
                if (msg.includes('already') || msg.includes('exists')) {
                    res.status(400).json({ error: 'E-mel ini telah didaftarkan di sistem auth.' });
                    return;
                }
                res.status(400).json({ error: msg || 'Gagal mencipta akaun auth.' });
                return;
            }
            userId = authResult.user.id;
        } else {
            // Without email: generate UUID (no Supabase Auth entry)
            const { randomUUID } = await import('crypto');
            userId = randomUUID();
        }

        // Insert into users table — status Active (admin-created, no OTP needed)
        const { data: newUser, error: insertError } = await supabaseAdmin
            .from('users')
            .insert({
                id: userId,
                full_name,
                ic_number,
                email: normalizedEmail || null,
                contact_no,
                contact_no_2: contact_no_2 || null,
                address,
                state: state || null,
                password_hash,
                password_plain: password,
                status: 'Active',
                email_verified: !!normalizedEmail,
                auth_provider: 'password'
            })
            .select()
            .single();

        if (insertError || !newUser) {
            console.error('Insert user failed:', insertError);
            res.status(500).json({ error: 'Gagal mencipta rekod pengguna.' });
            return;
        }

        // Send welcome email if email provided
        if (normalizedEmail) {
            try {
                const welcomeHtml = buildNotificationEmailHtml(
                    full_name,
                    'Selamat Datang ke E-CARE',
                    `Akaun pelanggan anda telah didaftarkan oleh pentadbir.\n\nAnda boleh log masuk menggunakan:\n• No IC: ${ic_number}\n• Kata Laluan: (seperti yang ditetapkan oleh pentadbir)\n\nSila tukar kata laluan anda selepas log masuk pertama.`,
                    undefined,
                    'no_link'
                );
                await sendEmail(normalizedEmail, 'Selamat Datang ke E-CARE', welcomeHtml);
                console.log(`[ADMIN-CREATE-USER] Welcome email sent to ${normalizedEmail}`);
            } catch (emailError) {
                console.error('[ADMIN-CREATE-USER] Failed to send welcome email:', emailError);
            }
        }

        const { password_hash: _, ...userWithoutPassword } = newUser;
        res.status(201).json({
            message: normalizedEmail
                ? 'Pelanggan berjaya didaftarkan. E-mel selamat datang telah dihantar.'
                : 'Pelanggan berjaya didaftarkan (tanpa e-mel).',
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Reset user password
export const resetUserPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const newPassword = Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 100).toString();
        const password_hash = await bcrypt.hash(newPassword, 10);

        const { data: userRow, error: fetchError } = await supabaseAdmin
            .from('users')
            .select('full_name, email, ic_number')
            .eq('id', id)
            .single();

        if (fetchError || !userRow) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const { error } = await supabaseAdmin
            .from('users')
            .update({ password_hash, password_plain: newPassword, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;

        if (userRow.email) {
            try {
                const subject = 'Kata Laluan E-CARE Telah Diset Semula';
                const message = `Kata laluan baharu anda: ${newPassword}\n\nNo IC: ${userRow.ic_number}\n\nSila log masuk menggunakan kata laluan baharu ini.`;
                const emailHtml = buildNotificationEmailHtml(
                    userRow.full_name || 'Pengguna',
                    subject,
                    message,
                    undefined,
                    'no_link'
                );
                await sendEmail(userRow.email, subject, emailHtml);
            } catch (emailErr) {
                console.error('Failed to send user password reset email:', emailErr);
            }
        }

        res.json({ message: 'Password reset successful', new_password: newPassword, ic_number: userRow.ic_number });
    } catch (error) {
        console.error('Reset user password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
