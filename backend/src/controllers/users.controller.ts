import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { supabaseAdmin } from '../config/supabase.js';
import { createNotification } from './notifications.controller.js';
import { isEmailAllowed } from '../utils/email.js';

// Get user profile
export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;


        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !data) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const { password_hash, ...userWithoutPassword } = data;
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
        const { full_name, email, contact_no, contact_no_2, address, state, ic_number } = req.body;

        if (email && !isEmailAllowed(email)) {
            res.status(400).json({ error: 'Sila gunakan alamat e-mel yang sah. Domain e-mel ini tidak dibenarkan.' });
            return;
        }

        const updates: any = { updated_at: new Date().toISOString() };
        if (full_name !== undefined) updates.full_name = full_name;
        if (email !== undefined) updates.email = email || null;
        if (contact_no !== undefined) updates.contact_no = contact_no;
        if (contact_no_2 !== undefined) updates.contact_no_2 = contact_no_2 || null;
        if (address !== undefined) updates.address = address;
        if (state !== undefined) updates.state = state || null;

        if (ic_number) {
            // Only allow updating IC if current IC starts with G-
            const { data: currentUser } = await supabaseAdmin.from('users').select('ic_number').eq('id', userId).single();
            if (currentUser && currentUser.ic_number.startsWith('G-')) {
                // Check if new IC is already used
                const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('ic_number', ic_number).neq('id', userId).single();
                if (existingUser) {
                    res.status(400).json({ error: 'IC number already registered by another user' });
                    return;
                }
                updates.ic_number = ic_number;
            }
        }

        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update(updates)
            .eq('id', userId);

        if (updateError) throw updateError;

        // Notify user about profile update
        await createNotification(
            userId!,
            'user',
            'Profil Dikemaskini',
            'Profil anda telah berjaya dikemaskini.',
            'status_update',
            0
        );

        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !data) throw error;

        const { password_hash, ...userWithoutPassword } = data;
        res.json({ message: 'Profile updated', user: userWithoutPassword });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Change password
export const changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { current_password, new_password } = req.body;

        const { data: userRow, error: fetchError } = await supabaseAdmin
            .from('users')
            .select('password_hash')
            .eq('id', userId)
            .single();

        if (fetchError || !userRow) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const validPassword = await bcrypt.compare(current_password, userRow.password_hash);
        if (!validPassword) {
            res.status(400).json({ error: 'Current password is incorrect' });
            return;
        }

        const password_hash = await bcrypt.hash(new_password, 10);

        const { error } = await supabaseAdmin
            .from('users')
            .update({ password_hash, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) throw error;

        // Notify user about password change
        await createNotification(
            userId!,
            'user',
            'Kata Laluan Ditukar',
            'Kata laluan akaun anda telah berjaya ditukar. Jika anda tidak membuat perubahan ini, sila hubungi kami segera.',
            'status_update',
            0
        );

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

        const extension = file.originalname.split('.').pop() || 'jpg';
        const fileName = `${userId}/${Date.now()}.${extension}`;
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('user-images')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true,
            });

        if (uploadError) {
            console.error('Avatar storage upload error:', uploadError);
            res.status(500).json({ error: 'Failed to upload avatar' });
            return;
        }

        const { data: urlData } = supabaseAdmin.storage
            .from('user-images')
            .getPublicUrl(uploadData.path);

        const publicUrl = urlData.publicUrl;

        // Update user record
        const { error } = await supabaseAdmin
            .from('users')
            .update({ user_image: publicUrl, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) throw error;
        res.json({ message: 'Avatar uploaded', url: publicUrl });
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
