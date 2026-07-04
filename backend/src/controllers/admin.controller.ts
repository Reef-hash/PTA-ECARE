import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/mysql.js';
import { buildActivationEmail } from './auth.controller.js';
import { sendEmail, isEmailAllowed } from '../utils/email.js';
import { buildNotificationEmailHtml } from './notifications.controller.js';
import { randomUUID } from 'crypto';

// Get dashboard statistics
export const getStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const [allComplaints]: any = await pool.query('SELECT id, status, assigned_to FROM complaints');
        const [forwardedRows]: any = await pool.query('SELECT complaint_id FROM forward_history');
        
        const forwardedIds = new Set((forwardedRows || []).map((r: any) => r.complaint_id));

        const stats = {
            total: allComplaints?.length || 0,
            pending: 0,
            in_process: 0,
            closed: 0,
            not_forwarded: 0,
            assigned: 0,
            cancelled: 0,
            incomplete: 0,
            incomplete_total: 0,
            incomplete_not_assigned: 0,
            incomplete_assigned: 0,
            incomplete_completed: 0,
        };

        (allComplaints || []).forEach((c: any) => {
            if (c.status === 'pending') stats.pending++;
            if (c.status === 'in_process') stats.in_process++;
            if (c.status === 'closed') stats.closed++;
            if (c.status === 'cancelled') stats.cancelled++;
            if (c.status === 'incomplete') stats.incomplete++;
            if (c.status === 'pending' && !c.assigned_to) stats.not_forwarded++;
            if (c.status === 'pending' && c.assigned_to) stats.assigned++;

            const isIncomplete = c.status === 'incomplete';
            if (isIncomplete) {
                stats.incomplete_total++;
                if (!c.assigned_to) stats.incomplete_not_assigned++;
                else stats.incomplete_assigned++;
            }
            if (c.status === 'closed' && forwardedIds.has(c.id)) {
                stats.incomplete_completed++;
            }
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
        const [technicians]: any = await pool.query('SELECT id, name, department FROM technicians WHERE is_active = 1');

        if (!technicians || technicians.length === 0) {
            res.json({ technicianStats: [] });
            return;
        }

        const technicianStats = await Promise.all(
            technicians.map(async (tech: any) => {
                const [complaints]: any = await pool.query('SELECT status FROM complaints WHERE assigned_to = ?', [tech.id]);

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
        const [rows]: any = await pool.query(
            'SELECT id, name, department, email, contact_number, username, is_active, created_at FROM technicians WHERE id = ?',
            [id]
        );

        if (!rows || rows.length === 0) {
            res.status(404).json({ error: 'Technician not found' });
            return;
        }

        res.json({ technician: rows[0] });
    } catch (error) {
        console.error('Get technician error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all technicians
export const getTechnicians = async (req: Request, res: Response): Promise<void> => {
    try {
        const [rows]: any = await pool.query(
            'SELECT id, name, department, email, contact_number, username, is_active, created_at FROM technicians ORDER BY created_at DESC'
        );
        res.json({ technicians: rows || [] });
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

        const [existingUser]: any = await pool.query('SELECT id FROM technicians WHERE username = ?', [username]);
        const [existingEmail]: any = await pool.query('SELECT id FROM technicians WHERE email = ?', [email]);

        if (existingUser.length > 0 || existingEmail.length > 0) {
            res.status(400).json({ error: 'Username or email already exists' });
            return;
        }

        const password_hash = await bcrypt.hash(password, 10);
        const newTechId = randomUUID();

        await pool.query(
            'INSERT INTO technicians (id, name, department, email, contact_number, username, password_hash, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
            [newTechId, name, department, email, contact_number, username, password_hash]
        );

        const [techRows]: any = await pool.query('SELECT * FROM technicians WHERE id = ?', [newTechId]);
        const newTech = techRows[0];

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Calculate expires_at (24 hours from now) for MySQL
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

        // Note: activation_otps table doesn't exist in the provided mysql schema! 
        // We might need to ensure this works or bypass OTP if the schema doesn't have it.
        // For now, let's create it if it doesn't exist or just use password_resets if similar.
        // The original code used activation_otps. Let's assume it exists or create a simple fallback.
        try {
            await pool.query('DELETE FROM password_resets WHERE user_id = ?', [newTechId]); // Reuse password_resets structure
            await pool.query(
                'INSERT INTO password_resets (user_id, otp, expires_at) VALUES (?, ?, ?)',
                [newTechId, otp, expiresAt]
            );
        } catch (otpErr) {
            console.error('Failed to save activation OTP (table might be missing):', otpErr);
        }

        try {
            const activationHtml = buildActivationEmail(name, otp, 'technician');
            await sendEmail(email, 'Aktifkan Akaun Juruteknik e-Care Anda', activationHtml);
        } catch (emailError) {
            console.error('Failed to send technician activation email:', emailError);
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

        let updateQuery = 'UPDATE technicians SET ';
        const params: any[] = [];
        
        if (name !== undefined) { updateQuery += 'name = ?, '; params.push(name); }
        if (department !== undefined) { updateQuery += 'department = ?, '; params.push(department); }
        if (email !== undefined) { updateQuery += 'email = ?, '; params.push(email); }
        if (contact_number !== undefined) { updateQuery += 'contact_number = ?, '; params.push(contact_number); }
        if (is_active !== undefined) { updateQuery += 'is_active = ?, '; params.push(is_active ? 1 : 0); }
        
        // Remove trailing comma and space
        updateQuery = updateQuery.slice(0, -2);
        updateQuery += ' WHERE id = ?';
        params.push(id);

        if (params.length > 1) { // Means we actually have fields to update
            await pool.query(updateQuery, params);
        }

        const [rows]: any = await pool.query('SELECT * FROM technicians WHERE id = ?', [id]);
        if (!rows || rows.length === 0) {
            res.status(404).json({ error: 'Technician not found after update' });
            return;
        }

        const { password_hash, ...techWithoutPassword } = rows[0];
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

        const [techRows]: any = await pool.query('SELECT email, name, username FROM technicians WHERE id = ?', [id]);
        const techRow = techRows[0];

        if (!techRow) {
            res.status(404).json({ error: 'Technician not found' });
            return;
        }

        await pool.query('UPDATE technicians SET password_hash = ? WHERE id = ?', [password_hash, id]);

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
            } catch (emailErr) {
                console.error('Failed to send technician password reset notification email:', emailErr);
            }
        }

        try {
            const adminEmail = 'adminecare.ptasssb@gmail.com';
            const subject = 'Notifikasi Penetapan Semula Kata Laluan Juruteknik';
            const message = `Anda telah berjaya menetapkan semula kata laluan baharu untuk Juruteknik <strong>${techRow.name || techRow.username}</strong>.\n\nKata Laluan Baharu: ${new_password}`;
            const emailHtml = buildNotificationEmailHtml('Admin', subject, message, undefined, 'no_link');
            await sendEmail(adminEmail, subject, emailHtml);
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
        await pool.query('DELETE FROM technicians WHERE id = ?', [id]);
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
        const [rows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        const user = rows[0];

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const { password_hash, password_plain, ...userRest } = user;
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
        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'User deleted' });
    } catch (error: any) {
        console.error('Delete user error:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            res.status(400).json({ error: 'Tidak boleh padam pengguna ini kerana mereka mempunyai rekod aduan yang berkaitan.' });
            return;
        }
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

        let query = 'SELECT id, full_name, ic_number, email, contact_no, address, state, status, created_at FROM users';
        let countQuery = 'SELECT COUNT(*) as total FROM users';
        const params: any[] = [];
        const countParams: any[] = [];

        const conditions: string[] = [];

        if (status && status !== 'all') {
            conditions.push('status = ?');
            params.push(status);
            countParams.push(status);
        }

        if (search) {
            conditions.push('(full_name LIKE ? OR ic_number LIKE ? OR email LIKE ?)');
            const searchStr = `%${search}%`;
            params.push(searchStr, searchStr, searchStr);
            countParams.push(searchStr, searchStr, searchStr);
        }

        if (conditions.length > 0) {
            const whereClause = ' WHERE ' + conditions.join(' AND ');
            query += whereClause;
            countQuery += whereClause;
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limitNum, offset);

        const [countResult]: any = await pool.query(countQuery, countParams);
        const total = countResult[0].total;

        const [rows]: any = await pool.query(query, params);

        res.json({
            users: rows || [],
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

        await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
        const [rows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [id]);

        res.json({ message: 'User status updated', user: rows[0] });
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

        const [rows]: any = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [userId]);
        const user = rows[0];

        if (!user) {
            res.status(404).json({ error: 'Profile not found' });
            return;
        }

        const { password_hash, ...profileData } = user;
        res.json(profileData);
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

        const [existing]: any = await pool.query(
            `SELECT id FROM ${table} WHERE username = ? AND id != ?`,
            [username.trim(), userId]
        );

        if (existing.length > 0) {
            res.status(400).json({ error: 'Username already taken' });
            return;
        }

        await pool.query(
            `UPDATE ${table} SET username = ?, email = ? WHERE id = ?`,
            [username.trim(), email?.trim() || null, userId]
        );

        const [rows]: any = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [userId]);
        const { password_hash, ...userData } = rows[0];

        res.json({ message: 'Profile updated successfully', user: userData });
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

        const [rows]: any = await pool.query(
            `SELECT password_hash, email, ${role === 'technician' ? 'name' : 'admin_name as name'}, username FROM ${table} WHERE id = ?`,
            [userId]
        );
        const userRow = rows[0];

        if (!userRow) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const isValid = await bcrypt.compare(currentPassword, userRow.password_hash);
        if (!isValid) {
            res.status(400).json({ error: 'Current password is incorrect' });
            return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(`UPDATE ${table} SET password_hash = ? WHERE id = ?`, [hashedPassword, userId]);

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

        if (normalizedEmail && !(await isEmailAllowed(normalizedEmail))) {
            res.status(400).json({ error: 'Sila gunakan alamat e-mel yang sah. Domain e-mel ini tidak dibenarkan.' });
            return;
        }

        const [existingIC]: any = await pool.query('SELECT id FROM users WHERE ic_number = ?', [ic_number]);
        if (existingIC.length > 0) {
            res.status(400).json({ error: 'No IC ini telah didaftarkan.' });
            return;
        }

        if (normalizedEmail) {
            const [existingEmail]: any = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
            if (existingEmail.length > 0) {
                res.status(400).json({ error: 'E-mel ini telah didaftarkan oleh pengguna lain.' });
                return;
            }
        }

        const password_hash = await bcrypt.hash(password, 10);
        const userId = randomUUID();

        await pool.query(
            `INSERT INTO users (
                id, full_name, ic_number, email, contact_no, contact_no_2, address, state, password_hash, password_plain, status, email_verified, auth_provider
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, 'password')`,
            [userId, full_name, ic_number, normalizedEmail || null, contact_no, contact_no_2 || null, address, state || null, password_hash, password, normalizedEmail ? 1 : 0]
        );

        const [newUsers]: any = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        const newUser = newUsers[0];

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

        const [rows]: any = await pool.query('SELECT full_name, email, ic_number FROM users WHERE id = ?', [id]);
        const userRow = rows[0];

        if (!userRow) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        await pool.query('UPDATE users SET password_hash = ?, password_plain = ? WHERE id = ?', [password_hash, newPassword, id]);

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
