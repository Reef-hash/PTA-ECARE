import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { randomUUID } from 'crypto';
import pool from '../config/mysql.js';
import { createNotification, buildNotificationEmailHtml } from './notifications.controller.js';
import { sendEmail, isEmailAllowed } from '../utils/email.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_ALLOWED_EMAIL_DOMAIN = (process.env.GOOGLE_ALLOWED_EMAIL_DOMAIN || 'gmail.com').toLowerCase();

const googleClient = new OAuth2Client();

type UserRow = {
    id: string;
    full_name: string;
    email: string | null;
    ic_number: string;
    contact_no?: string;
    contact_no_2?: string | null;
    address?: string;
    state?: string | null;
    status?: string;
    google_sub?: string | null;
    password_hash?: string;
    [key: string]: any;
};

type VerifiedGoogleAccount = {
    sub: string;
    email: string;
    email_verified: boolean;
    name?: string;
    picture?: string | null;
};

const isActiveUser = (status?: string): boolean => !status || status === 'Active' || status === 'active';

const createUserToken = (user: UserRow): string => jwt.sign(
    { id: user.id, role: 'user', ic_number: user.ic_number },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as SignOptions
);

const stripPasswordHash = (user: UserRow) => {
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

const isMissingGoogleAuthColumn = (error: any): boolean => {
    const message = String(error?.message || '');
    return message.includes('google_sub')
        || message.includes('auth_provider')
        || message.includes('email_verified')
        || message.includes('google_picture');
};

const verifyGoogleCredential = async (credential: string): Promise<TokenPayload> => {
    if (!GOOGLE_CLIENT_ID) {
        throw new Error('GOOGLE_CLIENT_ID is not configured');
    }

    let payload: any = null;

    if (credential.startsWith('ya29.')) {
        // It's a Google OAuth Access Token (from useGoogleLogin implicit flow)
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${credential}` }
        });
        if (!response.ok) {
            throw new Error('Failed to verify Google access token');
        }
        const data: any = await response.json();
        
        payload = {
            sub: data.sub,
            email: data.email,
            email_verified: data.email_verified,
            name: data.name,
            picture: data.picture
        };
    } else {
        // Assume it's an ID Token (JWT)
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
    }

    if (!payload?.sub || !payload.email) {
        throw new Error('Invalid Google token payload');
    }

    // Support both boolean and string representations of email_verified
    if (payload.email_verified === false || payload.email_verified === 'false') {
        throw new Error('Google email is not verified');
    }

    const emailDomain = payload.email.split('@')[1]?.toLowerCase();
    if (GOOGLE_ALLOWED_EMAIL_DOMAIN && emailDomain !== GOOGLE_ALLOWED_EMAIL_DOMAIN) {
        throw new Error(`Only ${GOOGLE_ALLOWED_EMAIL_DOMAIN} Google accounts are allowed`);
    }

    return payload;
};

const ensureAllowedGoogleEmail = (email: string): void => {
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (GOOGLE_ALLOWED_EMAIL_DOMAIN && emailDomain !== GOOGLE_ALLOWED_EMAIL_DOMAIN) {
        throw new Error(`Only ${GOOGLE_ALLOWED_EMAIL_DOMAIN} Google accounts are allowed`);
    }
};

const verifyGoogleAuthRequest = async (credential?: string): Promise<VerifiedGoogleAccount> => {
    if (!credential) {
        throw new Error('Google credential is required');
    }
    const payload = await verifyGoogleCredential(credential);
    const email = payload.email!.toLowerCase();
    ensureAllowedGoogleEmail(email);
    return {
        sub: payload.sub,
        email,
        email_verified: Boolean(payload.email_verified),
        name: payload.name,
        picture: payload.picture || null,
    };
};

const notifyGoogleRegistration = async (user: UserRow): Promise<void> => {
    await createNotification(
        user.id,
        'user',
        'Google Account Registered',
        'Your Google/Gmail customer account has been registered successfully.',
        'NEW_USER_REGISTERED'
    );

    const [admins]: any = await pool.query('SELECT id FROM admins');
    if (admins && admins.length > 0) {
        await Promise.all(admins.map((admin: any) => createNotification(
            admin.id,
            'admin',
            'New customer Registration',
            `${user.full_name} has just registered using Google. | uid:${user.id}`,
            'NEW_USER_REGISTERED'
        )));
    }

    const [technicians]: any = await pool.query('SELECT id FROM technicians WHERE is_active = ?', [true]);

    if (technicians && technicians.length > 0) {
        await Promise.all(technicians.map((technician: any) => createNotification(
            technician.id,
            'technician',
            'New Google Customer Registered',
            `A new Google/Gmail customer has registered: ${user.full_name}.`,
            'NEW_USER_REGISTERED'
        )));
    }
};

const buildOtpEmail = (name: string, otp: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
        <h2 style="color: #0f766e;">E-CARE Password Reset</h2>
        <p>Hi ${escapeHtml(name || 'Customer')},</p>
        <p>Your password reset OTP is:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; background: #f3f4f6; padding: 16px 20px; border-radius: 8px; text-align: center;">
            ${otp}
        </div>
        <p>This OTP will expire in 15 minutes.</p>
        <p>If you did not request this reset, please ignore this email.</p>
    </div>
`;

const escapeHtml = (value: string): string => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildWelcomeEmail = (name: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #111827; line-height: 1.6;">
        <div style="border: 1px solid #d1fae5; border-radius: 12px; overflow: hidden;">
            <div style="background: #0f766e; color: #ffffff; padding: 24px 28px;">
                <h1 style="margin: 0; font-size: 28px;">Welcome to E-CARE</h1>
            </div>
            <div style="padding: 28px;">
                <p style="margin-top: 0;">Hi ${escapeHtml(name || 'Customer')},</p>
                <p>Welcome to E-CARE. Your account has been registered successfully.</p>
                <p style="font-size: 16px; color: #0f766e; font-weight: 700;">
                    e-Care: Track your repair from start to finish. Receive live updates on your repair progress and get notified the moment it's ready for pickup.
                </p>
                <p>You can now log in to view your repair status, notifications, and service history.</p>
                <p style="margin-bottom: 0;">Thank you,<br />E-CARE Admin</p>
            </div>
        </div>
    </div>
`;

const sendWelcomeEmail = async (user: UserRow): Promise<void> => {
    if (!user.email) return;

    await sendEmail(
        user.email,
        'Welcome to E-CARE',
        buildWelcomeEmail(user.full_name)
    );
};

export const buildUserSignupOtpEmailHtml = (email: string, otp: string) => {
    let baseUrl = 'https://pta-ecare.vercel.app';
    if (process.env.FRONTEND_URL) {
        baseUrl = process.env.FRONTEND_URL.replace(/\/$/, '');
    }
    const confirmationUrl = `${baseUrl}/users/register?email=${encodeURIComponent(email)}&otp=${otp}`;

    return `
<div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 40px 0; width: 100%;">
    <div style="max-width: 600px; background-color: #ffffff; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; padding: 40px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; letter-spacing: 1px; text-transform: uppercase; color: #ffffff;">E-CARE</h1>
            <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9; color: #ffffff;">Powered by DFKTVETMARABESUT</p>
        </div>
        <div style="padding: 40px; line-height: 1.6; color: #334155;">
            <h2 style="color: #1e293b; margin-top: 0; font-size: 20px;">Sahkan Pendaftaran Akaun</h2>
            <p>Hi,</p>
            <p>Terima kasih kerana mendaftar dengan E-CARE. Sila klik butang di bawah untuk mengesahkan akaun anda:</p>
            <div style="text-align: center; margin: 35px 0;">
                <a href="${confirmationUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                    Sahkan Akaun
                </a>
            </div>
            <p>Atau gunakan kod OTP di bawah pada halaman pendaftaran:</p>
            <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background-color: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; color: #1e3a8a; margin: 20px 0; border: 1px dashed #cbd5e1; display: inline-block;">
                ${otp}
            </div>
            
            <div style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;"></div>
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">Hantaran automatik sistem e-Care. Sila abaikan jika anda tersilap menerima emel ini.</p>
        </div>
        <div style="background-color: #f1f5f9; padding: 30px; text-align: center; font-size: 12px; color: #64748b;">
            <p style="margin: 0 0 5px 0;">© 2026 <strong style="color: #1e3a8a;">DFKTVETMARABESUT</strong>. All rights reserved.</p>
            <p style="margin: 0;">Besut, Terengganu, Malaysia</p>
        </div>
    </div>
</div>
    `;
};

export const buildActivationEmail = (name: string, otp: string, role: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
        <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">E-CARE</h1>
                <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">Powered by DFKTVETMARABESUT</p>
            </div>
            <div style="padding: 30px;">
                <h2 style="color: #1e293b; margin-top: 0;">Aktifkan Akaun ${role === 'technician' ? 'Juruteknik' : 'Admin'} Anda</h2>
                <p>Hi ${escapeHtml(name)},</p>
                <p>Satu akaun ${role === 'technician' ? 'Juruteknik' : 'Admin'} e-Care telah didaftarkan untuk anda. Sila gunakan kod OTP di bawah untuk mengaktifkan akaun anda:</p>
                <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background-color: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; color: #1e3a8a; margin: 25px 0; border: 1px dashed #cbd5e1;">
                    ${otp}
                </div>
                <p>Masukkan kod OTP ini pada halaman log masuk untuk mengaktifkan akaun anda.</p>
                <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
                    <p style="font-size: 12px; color: #94a3b8; margin: 0;">Sekiranya anda tidak menjangkakan emel ini, sila hubungi pentadbir sistem.</p>
                </div>
            </div>
        </div>
    </div>
`;


export const verifyIC = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ic_number } = req.body;
        if (!ic_number || ic_number.length !== 12) {
            res.status(400).json({ error: 'No IC mestilah 12 digit' });
            return;
        }

        const [data]: any = await pool.query('SELECT id, full_name, ic_number, contact_no, address, state FROM users WHERE ic_number = ?', [ic_number]);

        if (!data || data.length === 0) {
            res.status(404).json({ registered: false, error: 'Maaf, maklumat anda belum didaftar. Sila daftar dahulu.' });
            return;
        }

        const user = data[0];
        const token = jwt.sign({ id: user.id, role: 'user', ic_number: user.ic_number }, JWT_SECRET, { expiresIn: '1h' } as SignOptions);

        res.json({ registered: true, user, token });
    } catch (error) {
        console.error('Verify IC error:', error);


        res.status(500).json({ error: 'Internal server error' });
    }
};

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { full_name, ic_number, email, contact_no, contact_no_2, address, state, password } = req.body;
        const normalizedEmail = email ? email.trim().toLowerCase() : '';

        // Validation for fake email domains
        if (normalizedEmail && !(await isEmailAllowed(normalizedEmail))) {
            res.status(400).json({ error: 'Sila gunakan alamat e-mel yang sah. Domain e-mel ini tidak dibenarkan.' });
            return;
        }

        // 1. Check if IC number is already registered
        const [existing]: any = await pool.query('SELECT id FROM users WHERE ic_number = ?', [ic_number]);
        if (existing && existing.length > 0) {
            res.status(400).json({ error: 'IC number already registered' });
            return;
        }

        // Check if email is already registered (if provided)
        if (normalizedEmail) {
            const [existingEmail]: any = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
            if (existingEmail && existingEmail.length > 0) {
                res.status(400).json({ error: 'E-mel ini telah didaftarkan. Sila gunakan e-mel lain atau log masuk.' });
                return;
            }
        }

        const userId = randomUUID();

        const password_hash = await bcrypt.hash(password, 10);

        // 3. Insert user into public users table
        const finalEmail = normalizedEmail || `no-email-${ic_number}@ptas.my`;
        await pool.query(
            `INSERT INTO users (id, full_name, ic_number, email, contact_no, contact_no_2, address, state, password_hash, status, email_verified, auth_provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'password')`,
            [userId, full_name, ic_number, finalEmail, contact_no, contact_no_2 || null, address, state || null, password_hash, normalizedEmail ? 'Inactive' : 'Active', normalizedEmail ? false : true]
        );
        const [userRows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (!userRows || userRows.length === 0) {
            res.status(500).json({ error: 'Gagal mencipta rekod profil pengguna' });
            return;
        }
        const user = userRows[0];

        if (normalizedEmail) {
            // 4. Generate random 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

            // Clean up any existing OTP for this email
            await pool.query('DELETE FROM activation_otps WHERE email = ? AND role = ?', [normalizedEmail, 'user']);

            // Insert into activation_otps
            const [otpResult]: any = await pool.query('INSERT INTO activation_otps (email, otp, role, expires_at) VALUES (?, ?, ?, ?)', [normalizedEmail, otp, 'user', expires_at]);

            if (!otpResult || otpResult.affectedRows === 0) {
                console.error('Failed to create activation OTP record');
                res.status(500).json({ error: 'Gagal menjana kod OTP pengesahan' });
                return;
            }

            // Send OTP email via Nodemailer
            try {
                const emailHtml = buildUserSignupOtpEmailHtml(normalizedEmail, otp);
                await sendEmail(normalizedEmail, 'Sahkan Pendaftaran Akaun E-CARE', emailHtml);
                console.log(`[REGISTER] Custom signup OTP email sent to ${normalizedEmail}`);
            } catch (emailError) {
                console.error('[REGISTER] Failed to send custom signup OTP email:', emailError);
                res.status(500).json({ error: 'Gagal menghantar kod OTP ke e-mel anda. Sila cuba lagi.' });
                return;
            }

            res.status(200).json({
                message: 'Pendaftaran berjaya! Sila semak e-mel anda untuk kod OTP pengesahan.',
                user: stripPasswordHash(user),
                requires_otp: true,
                email: user.email
            });
        } else {
            // Auto-login since no email OTP is needed
            const tokenPayload = {
                id: user.id,
                role: 'user',
                ic_number: user.ic_number
            };
            const token = jwt.sign(tokenPayload, process.env.JWT_SECRET as string, { expiresIn: '24h' });

            res.status(200).json({
                message: 'Pendaftaran berjaya! Akaun anda telah diaktifkan.',
                user: stripPasswordHash(user),
                requires_otp: false,
                token
            });
        }
    } catch (error: any) {
        console.error('Registration error:', error);
        res.status(500).json({ error: `Ralat Sistem: ${error.message}` });
    }
};

export const verifySignupOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, otp } = req.body;
        const normalizedEmail = email.trim().toLowerCase();

        // 1. Verify OTP with custom activation_otps table
        const [otpRecords]: any = await pool.query('SELECT * FROM activation_otps WHERE email = ? AND role = ? AND otp = ? AND expires_at >= ? ORDER BY created_at DESC LIMIT 1', [normalizedEmail, 'user', otp.trim(), new Date().toISOString()]);

        if (!otpRecords || otpRecords.length === 0) {
            res.status(400).json({ error: 'Kod OTP tidak sah atau telah tamat tempoh' });
            return;
        }

        // 2. Activate user in public users table
        await pool.query('UPDATE users SET status = ?, email_verified = ?, updated_at = ? WHERE email = ?', ['Active', true, new Date().toISOString(), normalizedEmail]);
        const [updatedUsers]: any = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

        if (!updatedUsers || updatedUsers.length === 0) {
            res.status(500).json({ error: 'Gagal mengaktifkan akaun dalam pangkalan data' });
            return;
        }

        const user = updatedUsers[0] as UserRow;

        // 3. Clean up verified OTP
        await pool.query('DELETE FROM activation_otps WHERE id = ?', [otpRecords[0].id]);

        // 4. Send welcome email now that the email is verified
        try {
            await sendWelcomeEmail(user);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
        }

        // Notify Admins via DB and Email directly to adminecare.ptasssb@gmail.com
        try {
            const [admins]: any = await pool.query('SELECT id FROM admins');
            if (admins && admins.length > 0) {
                for (const admin of admins) {
                    await pool.query('INSERT INTO notifications (recipient_id, recipient_role, title, message, type, is_read) VALUES (?, ?, ?, ?, ?, ?)', [admin.id, 'admin', 'Pendaftaran Pengguna Baru', `Pengguna baru telah mendaftar: ${user.full_name} | No. K/P: ${user.ic_number}\nuid:${user.id}`, 'system', false]);
                }
            }

            const adminEmail = 'adminecare.ptasssb@gmail.com';
            const emailSubject = 'Pendaftaran Pengguna Baru';
            const emailHtml = buildNotificationEmailHtml(
                'Administrator',
                emailSubject,
                `Seorang pengguna baru telah mendaftar di portal pentadbir:\n\nNama: ${user.full_name}\nNo. K/P: ${user.ic_number}\nE-mel: ${user.email || 'Tiada'}\n\nSila semak butiran di portal pentadbir.`,
                undefined,
                'no_link'
            );
            await sendEmail(adminEmail, emailSubject, emailHtml);
            console.log(`[VERIFY-OTP] Admin notification email sent to ${adminEmail}`);
        } catch (notifyError) {
            console.error('Failed to notify admins:', notifyError);
        }

        // 5. Create local session token
        const token = createUserToken(user);

        res.json({
            message: 'Akaun berjaya disahkan dan diaktifkan!',
            user: stripPasswordHash(user),
            token,
            role: 'user'
        });
    } catch (error: any) {
        console.error('Verify signup OTP error:', error);
        res.status(500).json({ error: `Ralat Sistem: ${error.message}` });
    }
};

export const resendSignupOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ error: 'E-mel diperlukan' });
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Delete any existing OTP records for this email and role user
        await pool.query('DELETE FROM activation_otps WHERE email = ? AND role = ?', [normalizedEmail, 'user']);

        // 2. Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        // 3. Insert into activation_otps
        const [otpInsertResult]: any = await pool.query('INSERT INTO activation_otps (email, otp, role, expires_at) VALUES (?, ?, ?, ?)', [normalizedEmail, otp, 'user', expires_at]);

        if (!otpInsertResult || otpInsertResult.affectedRows === 0) {
            console.error('Failed to create activation OTP record');
            res.status(500).json({ error: 'Gagal menjana kod OTP pengesahan' });
            return;
        }

        // 4. Send OTP email via Nodemailer
        try {
            const emailHtml = buildUserSignupOtpEmailHtml(normalizedEmail, otp);
            await sendEmail(normalizedEmail, 'Sahkan Pendaftaran Akaun E-CARE', emailHtml);
            console.log(`[RESEND-OTP] Custom signup OTP email sent to ${normalizedEmail}`);
        } catch (emailError) {
            console.error('[RESEND-OTP] Failed to send custom signup OTP email:', emailError);
            res.status(500).json({ error: 'Gagal menghantar kod OTP ke e-mel anda.' });
            return;
        }

        res.json({ message: 'Kod OTP baharu telah dihantar ke e-mel anda.' });
    } catch (error) {
        console.error('Resend signup OTP error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const verifyActivationOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, role, otp } = req.body;
        const table = role === 'technician' ? 'technicians' : 'admins';

        // 1. Get user profile
        const [profileRows]: any = await pool.query('SELECT * FROM ?? WHERE username = ? LIMIT 1', [table, username]);
        const profile = profileRows[0];

        if (!profileRows || profileRows.length === 0) {
            res.status(404).json({ error: 'Akaun tidak ditemui' });
            return;
        }

        const email = profile.email;

        // 2. Look up code in activation_otps
        const [otpRecords]: any = await pool.query('SELECT * FROM activation_otps WHERE email = ? AND role = ? AND otp = ? AND expires_at >= ? ORDER BY created_at DESC LIMIT 1', [email, role, otp, new Date().toISOString()]);

        if (!otpRecords || otpRecords.length === 0) {
            res.status(400).json({ error: 'Kod OTP tidak sah atau telah tamat tempoh' });
            return;
        }

        // 3. Update account to active
        await pool.query('UPDATE ?? SET status = ?, updated_at = ? WHERE id = ?', [table, 'Active', new Date().toISOString(), profile.id]);

        // 4. Clean up verified OTP
        await pool.query('DELETE FROM activation_otps WHERE id = ?', [otpRecords[0].id]);

        // 5. Generate session token
        const tokenPayload = role === 'admin' 
            ? { id: profile.id, role: 'admin', username: profile.username }
            : { id: profile.id, role: 'technician', username: profile.username };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
        const { password_hash, ...userWithoutPassword } = profile;

        res.json({
            message: 'Akaun berjaya diaktifkan!',
            user: userWithoutPassword,
            token,
            role
        });
    } catch (error) {
        console.error('Verify activation OTP error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const resendActivationOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, role } = req.body;
        const table = role === 'technician' ? 'technicians' : 'admins';

        const [profileRows]: any = await pool.query('SELECT * FROM ?? WHERE username = ? LIMIT 1', [table, username]);

        if (!profileRows || profileRows.length === 0) {
            res.status(404).json({ error: 'Akaun tidak ditemui' });
            return;
        }

        const profile = profileRows[0];
        const email = profile.email;
        const name = role === 'technician' ? profile.name : profile.admin_name;

        // Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

        // Delete previous OTPs for this email and role
        await pool.query('DELETE FROM activation_otps WHERE email = ? AND role = ?', [email, role]);

        // Save new OTP
        const [insertResult]: any = await pool.query('INSERT INTO activation_otps (email, role, otp, expires_at) VALUES (?, ?, ?, ?)', [email, role, otp, expiresAt]);

        if (!insertResult || insertResult.affectedRows === 0) {
            res.status(500).json({ error: 'Gagal menjana kod OTP baharu' });
            return;
        }

        // Send email
        try {
            const activationHtml = buildActivationEmail(name, otp, role);
            await sendEmail(email, `Aktifkan Akaun ${role === 'technician' ? 'Juruteknik' : 'Admin'} e-Care Anda`, activationHtml);
        } catch (emailError) {
            console.error('Failed to send activation email:', emailError);
            res.status(500).json({ error: 'Gagal menghantar emel OTP. Sila hubungi pentadbir.' });
            return;
        }

        res.json({ message: 'Kod OTP baharu telah dihantar ke e-mel berdaftar anda.' });
    } catch (error) {
        console.error('Resend activation OTP error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
    try {
        const { credential, full_name, ic_number, contact_no, contact_no_2, address, state, intent } = req.body;
        let googleAccount: VerifiedGoogleAccount;

        try {
            googleAccount = await verifyGoogleAuthRequest(credential);
        } catch (error: any) {
            const message = String(error?.message || 'Invalid Google credential');
            if (message.includes('GOOGLE_CLIENT_ID')) {
                res.status(500).json({ error: 'Google authentication is not configured on the server' });
                return;
            }
            if (message.includes('Only ')) {
                res.status(400).json({ error: message });
                return;
            }
            res.status(401).json({ error: message });
            return;
        }

        const googleSub = googleAccount.sub;
        const googleEmail = googleAccount.email;
        const googleName = String(full_name || googleAccount.name || googleEmail.split('@')[0]).trim();
        const googlePicture = googleAccount.picture || null;

        // --- Look up existing user by google_sub ---
        let user: UserRow | null = null;
        try {
            const [googleUsers]: any = await pool.query('SELECT * FROM users WHERE google_sub = ? LIMIT 1', [googleSub]);
            if (googleUsers.length > 0) user = googleUsers[0];
        } catch (err: any) {
            if (isMissingGoogleAuthColumn(err)) {
                res.status(500).json({ error: 'Google auth database fields are missing. Please add google_sub, auth_provider, email_verified, google_picture columns to users table.' });
                return;
            }
            throw err;
        }

        // --- Fallback: look up by email ---
        if (!user) {
            const [emailUsers]: any = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [googleEmail]);
            user = (emailUsers?.[0] as UserRow | undefined) || null;
        }

        // ============================================
        // INTENT = REGISTER (Sign Up with Google)
        // ============================================
        if (intent === 'register') {
            if (user) {
                // User already exists → tell them to Sign In instead
                res.status(400).json({
                    error: 'Akaun email ini sudah didaftarkan. Sila Log In.',
                    redirect_to_login: true
                });
                return;
            }

            // --- New user: check if IC provided (from complete-profile form) ---
            if (ic_number && contact_no && address) {
                // Full registration with profile data
                const [existingIcRows]: any = await pool.query('SELECT id FROM users WHERE ic_number = ? LIMIT 1', [ic_number]);

                if (existingIcRows && existingIcRows.length > 0) {
                    res.status(400).json({ error: 'IC number already registered. Please use a different IC number.' });
                    return;
                }

                const newUserId = randomUUID();
                const password_hash = await bcrypt.hash(`google:${googleSub}:${randomUUID()}`, 10);
                await pool.query(
                    'INSERT INTO users (id, full_name, ic_number, email, contact_no, contact_no_2, address, state, password_hash, google_sub, auth_provider, email_verified, google_picture) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [newUserId, googleName, ic_number, googleEmail, contact_no, contact_no_2 || null, address, state || null, password_hash, googleSub, 'google', true, googlePicture]
                );
                const [newUserRows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [newUserId]);
                if (!newUserRows || newUserRows.length === 0) throw new Error('Failed to create user');
                const newUser = newUserRows[0] as UserRow;

                try { await notifyGoogleRegistration(newUser); } catch (e) { console.error('Notify error:', e); }
                try { await sendWelcomeEmail(newUser); } catch (e) { console.error('Welcome email error:', e); }

                const token = createUserToken(newUser);
                res.status(201).json({
                    message: 'Google registration successful',
                    user: stripPasswordHash(newUser),
                    token,
                    role: 'user',
                    is_new_user: true,
                    profile_complete: true
                });
                return;
            }

            // --- New user: create with placeholder data, needs profile completion ---
            const placeholderIc = `G-${randomUUID().replace(/-/g, '').substring(0, 10)}`;
            const newUserId = randomUUID();
            const password_hash = await bcrypt.hash(`google:${googleSub}:${randomUUID()}`, 10);
            await pool.query(
                'INSERT INTO users (id, full_name, ic_number, email, contact_no, address, password_hash, google_sub, auth_provider, email_verified, google_picture, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [newUserId, googleName, placeholderIc, googleEmail, '0000000000', 'Pending', password_hash, googleSub, 'google', false, googlePicture, 'Inactive']
            );
            const [newUserRows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [newUserId]);
            if (!newUserRows || newUserRows.length === 0) throw new Error('Failed to create user');
            const newUser = newUserRows[0] as UserRow;

            // Generate OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

            await pool.query('DELETE FROM activation_otps WHERE email = ? AND role = ?', [googleEmail, 'user']);
            await pool.query('INSERT INTO activation_otps (email, role, otp, expires_at) VALUES (?, ?, ?, ?)', [googleEmail, 'user', otp, expires_at]);

            try {
                const emailHtml = buildUserSignupOtpEmailHtml(googleEmail, otp);
                await sendEmail(googleEmail, 'Sahkan Akaun Google Anda', emailHtml);
            } catch (e) {
                console.error('Failed to send Google OTP email:', e);
            }

            try { await notifyGoogleRegistration(newUser); } catch (e) { console.error('Notify error:', e); }

            res.status(201).json({
                message: 'Google registration successful — OTP sent to your email',
                user: stripPasswordHash(newUser),
                requires_otp: true,
                email: googleEmail,
                role: 'user',
                is_new_user: true,
                profile_complete: false,
                redirect_to_profile: true
            });
            return;
        }

        // ============================================
        // INTENT = LOGIN (Sign In with Google)
        // ============================================
        if (intent === 'login') {
            if (!user) {
                // User doesn't exist → tell them to Sign Up
                res.status(404).json({
                    error: 'Akaun tidak ditemui. Sila Sign Up.',
                    redirect_to_register: true
                });
                return;
            }

            if (!isActiveUser(user.status)) {
                res.status(403).json({ error: 'Account is not active. Please contact administrator.' });
                return;
            }

            // Update Google fields
            const updates: any = {
                google_sub: user.google_sub || googleSub,
                auth_provider: 'google',
                email_verified: true,
                google_picture: googlePicture,
                updated_at: new Date().toISOString(),
            };

            if (!user.email || user.email.toLowerCase() !== googleEmail) {
                updates.email = googleEmail;
            }

            await pool.query('UPDATE users SET google_sub = ?, auth_provider = ?, email_verified = ?, google_picture = ?, updated_at = ? WHERE id = ?',
                [updates.google_sub, updates.auth_provider, updates.email_verified, updates.google_picture, updates.updated_at, user.id]);
            if (updates.email) await pool.query('UPDATE users SET email = ? WHERE id = ?', [updates.email, user.id]);
            const [updatedRows]: any = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [user.id]);
            const activeUser = updatedRows[0] as UserRow;

            const profileComplete = !activeUser.ic_number.startsWith('G-');
            const token = createUserToken(activeUser);

            res.json({
                message: 'Google login successful',
                user: stripPasswordHash(activeUser),
                token,
                role: 'user',
                is_new_user: false,
                profile_complete: profileComplete,
                redirect_to_profile: !profileComplete
            });
            return;
        }

        // ============================================
        // NO INTENT (legacy / fallback behaviour)
        // ============================================
        if (user) {
            if (user.status === 'Inactive' || user.status === 'Suspended') {
                res.status(403).json({ error: 'Account is not active. Please contact administrator.' });
                return;
            }

            const updates: any = {
                google_sub: user.google_sub || googleSub,
                auth_provider: 'google',
                email_verified: true,
                google_picture: googlePicture,
                updated_at: new Date().toISOString(),
            };

            if (!user.email || user.email.toLowerCase() !== googleEmail) {
                updates.email = googleEmail;
            }

            await pool.query('UPDATE users SET google_sub = ?, auth_provider = ?, email_verified = ?, google_picture = ?, updated_at = ? WHERE id = ?',
                [updates.google_sub, updates.auth_provider, updates.email_verified, updates.google_picture, updates.updated_at, user.id]);
            if (updates.email) await pool.query('UPDATE users SET email = ? WHERE id = ?', [updates.email, user.id]);
            const [updatedRows]: any = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [user.id]);
            const activeUser = updatedRows[0] as UserRow;

            const token = createUserToken(activeUser);
            res.json({
                message: 'Google login successful',
                user: stripPasswordHash(activeUser),
                token,
                role: 'user',
                is_new_user: false
            });
            return;
        }

        // No intent, no user → require profile
        if (!ic_number || !contact_no || !address) {
            res.status(400).json({
                error: 'Please complete IC number, phone number, and address before Google registration',
                requires_profile: true,
                google_profile: {
                    full_name: googleName,
                    email: googleEmail,
                    picture: googlePicture
                }
            });
            return;
        }

        const [existingIcRows]: any = await pool.query('SELECT id FROM users WHERE ic_number = ? LIMIT 1', [ic_number]);

        if (existingIcRows && existingIcRows.length > 0) {
            res.status(400).json({ error: 'IC number already registered. Please login with your existing account or contact administrator.' });
            return;
        }

        const password_hash = await bcrypt.hash(`google:${googleSub}:${randomUUID()}`, 10);
        const newUserId = randomUUID();
        await pool.query(
            'INSERT INTO users (id, full_name, ic_number, email, contact_no, contact_no_2, address, state, password_hash, google_sub, auth_provider, email_verified, google_picture) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [newUserId, googleName, ic_number, googleEmail, contact_no, contact_no_2 || null, address, state || null, password_hash, googleSub, 'google', true, googlePicture]
        );
        const [newUserRows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [newUserId]);
        if (!newUserRows || newUserRows.length === 0) throw new Error('Failed to create user');
        const newUser = newUserRows[0] as UserRow;

        try { await notifyGoogleRegistration(newUser); } catch (e) { console.error('Notify error:', e); }
        try { await sendWelcomeEmail(newUser); } catch (e) { console.error('Welcome email error:', e); }

        const token = createUserToken(newUser);
        res.status(201).json({
            message: 'Google registration successful',
            user: stripPasswordHash(newUser),
            token,
            role: 'user',
            is_new_user: true
        });
    } catch (error: any) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: `Ralat Sistem (Google Auth): ${error.message}` });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ic_number, username, password, role } = req.body;
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

        console.log(`[LOGIN] Attempt: role=${role}, username=${username}, ic_number=${ic_number}`);

        let user: any = null;
        let tokenPayload: any = null;

        if (role === 'user') {
            if (!ic_number) { res.status(400).json({ error: 'IC number is required' }); return; }
            const [data]: any = await pool.query('SELECT * FROM users WHERE ic_number = ?', [ic_number]);
            console.log(`[LOGIN] User query result: found=${data?.length}, error=none`);
            if (!data || data.length === 0) {
                try { await pool.query('INSERT INTO user_logs (username, user_ip, success) VALUES (?, ?, ?)', [ic_number, clientIp, false]); } catch (e) { console.log('[LOGIN] user_logs insert error (ignored):', e); }
                res.status(401).json({ error: 'Invalid IC number or password' }); return;
            }
            user = data[0];
            tokenPayload = { id: user.id, role: 'user', ic_number: user.ic_number };
        } else if (role === 'admin') {
            if (!username) { res.status(400).json({ error: 'Username is required' }); return; }
            const [data]: any = await pool.query('SELECT * FROM admins WHERE LOWER(username) = LOWER(?)', [username]);
            if (!data || data.length === 0) { res.status(401).json({ error: 'Invalid username or password' }); return; }
            user = data[0];
            tokenPayload = { id: user.id, role: 'admin', username: user.username };
        } else if (role === 'technician') {
            if (!username) { res.status(400).json({ error: 'Username is required' }); return; }
            const [data]: any = await pool.query('SELECT * FROM technicians WHERE LOWER(username) = LOWER(?)', [username]);
            if (!data || data.length === 0) { res.status(401).json({ error: 'Invalid username or password' }); return; }
            user = data[0];
            tokenPayload = { id: user.id, role: 'technician', username: user.username };
        } else if (role === 'main_technician') {
            if (!username) { res.status(400).json({ error: 'Username/Email is required' }); return; }
            // Try matching either username or email
            const [data]: any = await pool.query('SELECT * FROM technicians WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)', [username, username]);
            if (!data || data.length === 0) { res.status(401).json({ error: 'Invalid credentials' }); return; }
            
            user = data[0];
            
            // Only allow specific email to be main technician
            if (user.email !== 'technicianasign@gmail.com') {
                res.status(401).json({ error: 'Invalid credentials' }); return;
            }
            
            tokenPayload = { id: user.id, role: 'main_technician', username: user.username };
        } else {
            res.status(400).json({ error: 'Invalid role' }); return;
        }

        console.log(`[LOGIN] Comparing password for user: ${user?.id}`);
        const dbHash = user.password_hash || user.password;
        let validPassword = false;
        
        if (dbHash && (dbHash.startsWith('$2b$') || dbHash.startsWith('$2a$'))) {
            validPassword = await bcrypt.compare(password, dbHash);
        } else {
            // Fallback for plain text passwords entered directly in phpMyAdmin
            validPassword = (password === dbHash);
            
            // Auto-upgrade plain text to bcrypt hash in database for security
            if (validPassword) {
                try {
                    const newHash = await bcrypt.hash(password, 10);
                    let table = 'users';
                    if (role === 'admin') table = 'admins';
                    else if (role === 'technician' || role === 'main_technician') table = 'technicians';
                    
                    const updateCol = user.password_hash !== undefined ? 'password_hash' : 'password';
                    await pool.query(`UPDATE ${table} SET ${updateCol} = ? WHERE id = ?`, [newHash, user.id]);
                    console.log(`[LOGIN] Auto-upgraded plain text password for ${role} ${user.id}`);
                } catch(e) {
                    console.error('[LOGIN] Auto-upgrade password failed:', e);
                }
            }
        }

        console.log(`[LOGIN] Password valid: ${validPassword}`);
        if (!validPassword) {
            if (role === 'user') {
                try { await pool.query('INSERT INTO user_logs (user_id, username, user_ip, success) VALUES (?, ?, ?, ?)', [user.id, ic_number || username, clientIp, false]); } catch (e) { console.log('[LOGIN] user_logs insert error (ignored):', e); }
            }
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Check activation / active state after successful password comparison
        if (role === 'user') {
            if (user.status === 'Inactive' || user.status === 'Suspended') {
                console.log(`[LOGIN] User requires email verification (email: ${user.email})`);
                await pool.query('UPDATE users SET status = ?, email_verified = ? WHERE id = ?', ['Active', true, user.id]);
                const [activatedRows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [user.id]);
                if (activatedRows && activatedRows.length > 0) {
                    user = activatedRows[0];
                } else {
                    res.status(403).json({ error: 'Account is not active. Please contact administrator.' });
                    return;
                }
            }
            try { await pool.query('INSERT INTO user_logs (user_id, username, user_ip, success) VALUES (?, ?, ?, ?)', [user.id, ic_number, clientIp, true]); } catch (e) { console.log('[LOGIN] user_logs insert error (ignored):', e); }
        } else if (role === 'admin' || role === 'technician') {
            // MySQL uses 0 for false in TINYINT(1). Null shouldn't block.
            if (user.status === 'Inactive' || user.status === 'Suspended') {
                // Check if there's a pending activation OTP for this admin/technician
                const [otpRecords]: any = await pool.query('SELECT * FROM activation_otps WHERE email = ? AND role = ? AND expires_at >= ? ORDER BY created_at DESC LIMIT 1', [user.email, role, new Date().toISOString()]);

                if (otpRecords && otpRecords.length > 0) {
                    res.status(403).json({
                        error: 'Akaun anda belum diaktifkan. Sila masukkan kod OTP yang dihantar ke e-mel anda.',
                        requires_activation: true,
                        email: user.email,
                        username: user.username,
                        role
                    });
                    return;
                }
                res.status(403).json({ error: 'Akaun anda tidak aktif. Sila hubungi pentadbir.' });
                return;
            }
        }

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
        const { password_hash, ...userWithoutPassword } = user;

        console.log(`[LOGIN] Success for ${role}: ${user.id}`);
        res.json({ message: 'Login successful', user: userWithoutPassword, token, role });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ic_number, email } = req.body;
        let data: any[];
        if (ic_number) {
            const [rows]: any = await pool.query('SELECT id, email, full_name FROM users WHERE ic_number = ?', [ic_number]);
            data = rows;
        } else if (email) {
            const [rows]: any = await pool.query('SELECT id, email, full_name FROM users WHERE email = ?', [email]);
            data = rows;
        } else {
            data = [];
        }
        const user = data && data[0] ? data[0] : null;

        if (!user) { res.status(404).json({ error: 'User not found' }); return; }
        if (!user.email) { res.status(400).json({ error: 'No email associated with this account' }); return; }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        await pool.query('DELETE FROM password_resets WHERE user_id = ?', [user.id]);
        await pool.query('INSERT INTO password_resets (user_id, otp, expires_at) VALUES (?, ?, ?)', [user.id, otp, expiresAt]);

        try {
            await sendEmail(
                user.email,
                'E-CARE Password Reset OTP',
                buildOtpEmail(user.full_name, otp)
            );
        } catch (emailError) {
            await pool.query('DELETE FROM password_resets WHERE user_id = ?', [user.id]);
            console.error('Failed to send password reset OTP email:', emailError);
            res.status(500).json({ error: 'Failed to send OTP email. Please check SMTP settings.' });
            return;
        }

        console.log(`OTP email sent to ${user.email}`);
        res.json({ message: 'OTP sent to your email', email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ic_number, email, otp } = req.body;
        let data: any[];
        if (ic_number) {
            const [rows]: any = await pool.query('SELECT id FROM users WHERE ic_number = ?', [ic_number]);
            data = rows;
        } else if (email) {
            const [rows]: any = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
            data = rows;
        } else {
            data = [];
        }
        const userId = data && data[0] ? data[0].id : null;

        if (!userId) { res.status(404).json({ error: 'User not found' }); return; }

        const [resetRows]: any = await pool.query('SELECT * FROM password_resets WHERE user_id = ? AND otp = ?', [userId, otp]);
        if (!resetRows || resetRows.length === 0) { res.status(400).json({ error: 'Invalid OTP' }); return; }

        if (new Date(resetRows[0].expires_at) < new Date()) { res.status(400).json({ error: 'OTP has expired' }); return; }
        res.json({ message: 'OTP verified', valid: true });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ic_number, email, otp, new_password } = req.body;
        let data: any[];
        if (ic_number) {
            const [rows]: any = await pool.query('SELECT id FROM users WHERE ic_number = ?', [ic_number]);
            data = rows;
        } else if (email) {
            const [rows]: any = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
            data = rows;
        } else {
            data = [];
        }
        const userId = data && data[0] ? data[0].id : null;

        if (!userId) { res.status(404).json({ error: 'User not found' }); return; }

        const [resetRows]: any = await pool.query('SELECT * FROM password_resets WHERE user_id = ? AND otp = ?', [userId, otp]);
        if (!resetRows || resetRows.length === 0 || new Date(resetRows[0].expires_at) < new Date()) {
            res.status(400).json({ error: 'Invalid or expired OTP' }); return;
        }

        const password_hash = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [password_hash, new Date().toISOString(), userId]);
        await pool.query('DELETE FROM password_resets WHERE user_id = ?', [userId]);

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;
        const role = (req as any).user?.role;

        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        let table = 'users';
        if (role === 'admin') table = 'admins';
        if (role === 'technician') table = 'technicians';

        const [data]: any = await pool.query('SELECT * FROM ?? WHERE id = ?', [table, userId]);

        if (!data || data.length === 0) { res.status(404).json({ error: 'User not found' }); return; }

        const { password_hash, ...userWithoutPassword } = data[0];
        res.json({ user: userWithoutPassword, role });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
