import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/mysql.js';
import { saveFile } from '../utils/storage.js';
import { createNotification } from './notifications.controller.js';
import { isEmailAllowed, sendEmail } from '../utils/email.js';
import { buildUserSignupOtpEmailHtml } from './auth.controller.js';

// Get user profile
export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        const [rows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        const user = rows[0];

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const { password_hash, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        
        const { full_name, email, contact_no, contact_no_2, address, state, ic_number } = req.body;

        if (email && !(await isEmailAllowed(email))) {
            res.status(400).json({ error: 'Sila gunakan alamat e-mel yang sah. Domain e-mel ini tidak dibenarkan.' });
            return;
        }

        const updates: any = {};
        if (full_name !== undefined) updates.full_name = full_name;
        if (email !== undefined) updates.email = email || null;
        if (contact_no !== undefined) updates.contact_no = contact_no;
        if (contact_no_2 !== undefined) updates.contact_no_2 = contact_no_2 || null;
        if (address !== undefined) updates.address = address;
        if (state !== undefined) updates.state = state || null;

        let requiresOtp = false;
        let emailToUse = '';
        let completedGoogleProfile = false;

        if (ic_number) {
            const [userRows]: any = await pool.query('SELECT ic_number, email FROM users WHERE id = ?', [userId]);
            const currentUser = userRows[0];

            if (!currentUser) {
                res.status(404).json({ error: 'Pengguna tidak ditemui.' });
                return;
            }

            if (currentUser.ic_number && currentUser.ic_number.startsWith('G-')) {
                const [existingUserRows]: any = await pool.query('SELECT id FROM users WHERE ic_number = ? AND id != ?', [ic_number, userId]);

                if (existingUserRows.length > 0) {
                    res.status(400).json({ error: 'No IC ini telah didaftarkan oleh pengguna lain.' });
                    return;
                }
                updates.ic_number = ic_number;
                
                // No longer requires OTP here since they already verified during Google Auth registration
                // updates.status = 'Inactive';
                // updates.email_verified = 0;
                // requiresOtp = true;
                emailToUse = email || currentUser.email;
                completedGoogleProfile = true;
            }
        }

        if (Object.keys(updates).length > 0) {
            let updateQuery = 'UPDATE users SET ';
            const params: any[] = [];
            
            for (const [key, value] of Object.entries(updates)) {
                updateQuery += `${key} = ?, `;
                params.push(value);
            }
            
            updateQuery = updateQuery.slice(0, -2);
            updateQuery += ' WHERE id = ?';
            params.push(userId);

            await pool.query(updateQuery, params);
        }

        if (requiresOtp && emailToUse) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

            await pool.query('DELETE FROM activation_otps WHERE email = ? AND role = ?', [emailToUse, 'user']);
            await pool.query('INSERT INTO activation_otps (email, role, otp, expires_at) VALUES (?, ?, ?, ?)', [emailToUse, 'user', otp, expires_at]);

            try {
                const emailHtml = buildUserSignupOtpEmailHtml(emailToUse, otp);
                await sendEmail(emailToUse, 'Sahkan Pendaftaran Akaun E-CARE', emailHtml);
            } catch (emailError: any) {
                console.error('OTP email send failed:', emailError?.message || emailError);
                res.status(500).json({ error: 'Gagal menghantar kod OTP ke e-mel anda. Sila cuba lagi.' });
                return;
            }

            res.json({
                message: 'Maklumat profil dikemaskini! Sila semak e-mel anda untuk kod OTP pengesahan.',
                requires_otp: true,
                email: emailToUse
            });
            return;
        }

        if (completedGoogleProfile) {
            try {
                const [admins]: any = await pool.query('SELECT id FROM admins');
                if (admins && admins.length > 0) {
                    await Promise.all(admins.map((admin: any) => createNotification(
                        admin.id,
                        'admin',
                        'New Customer Registration',
                        `${full_name || 'Pengguna'} has just registered using Google. | uid:${userId}`,
                        'NEW_USER_REGISTERED'
                    )));
                }
                // (User bell notification is handled below for all profile updates)
            } catch (notifyError) {
                console.error('Failed to notify admins of completed profile:', notifyError);
            }
        }

        if (requiresOtp && !emailToUse) {
            console.error('OTP required but user has no email. userId:', userId);
            res.status(400).json({ error: 'Emel pengguna tidak ditemui. Hubungi pentadbir.' });
            return;
        }

        // Direct insert to avoid sending an email
        await pool.query(
            'INSERT INTO notifications (recipient_id, recipient_role, title, message, type, is_read) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, 'user', 'Profil Dikemaskini', 'Profil anda telah berjaya dikemaskini.', 'system', false]
        );

        const [updatedUserRows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        const updatedUser = updatedUserRows[0];

        if (!updatedUser) {
            res.status(404).json({ error: 'Pengguna tidak ditemui selepas dikemaskini.' });
            return;
        }

        const { password_hash, ...userWithoutPassword } = updatedUser;
        res.json({ message: 'Profile updated', user: userWithoutPassword });
    } catch (error: any) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: `Ralat Sistem: ${error.message}` });
    }
};

// Change password
export const changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { current_password, new_password } = req.body;

        const [userRows]: any = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
        const userRow = userRows[0];

        if (!userRow) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const validPassword = await bcrypt.compare(current_password, userRow.password_hash);
        if (!validPassword) {
            res.status(400).json({ error: 'Current password is incorrect' });
            return;
        }

        const password_hash = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, userId]);

        await createNotification(userId!, 'user', 'Kata Laluan Ditukar', 'Kata laluan akaun anda telah berjaya ditukar. Jika anda tidak membuat perubahan ini, sila hubungi kami segera.', 'status_update', 0);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Upload avatar
export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const file = req.file;

        if (!file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const mimeExt: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };
        const extension = mimeExt[file.mimetype] || 'jpg';
        const fileName = `${userId}_${Date.now()}.${extension}`;

        try {
            const { publicUrl } = saveFile('user-images', fileName, file.buffer);
            await pool.query('UPDATE users SET user_image = ? WHERE id = ?', [publicUrl, userId]);
            res.json({ message: 'Avatar uploaded', url: publicUrl });
        } catch (e) {
            console.error('Avatar storage upload error:', e);
            res.status(500).json({ error: 'Failed to upload avatar' });
        }
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
