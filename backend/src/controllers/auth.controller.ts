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

const verifyGoogleCredential = async (credential: string): Promise<TokenPayload> => {
    if (!GOOGLE_CLIENT_ID) {
        throw new Error('GOOGLE_CLIENT_ID is not configured');
    }
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) throw new Error('Invalid Google token payload');
    if (!payload.email_verified) throw new Error('Google email is not verified');

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

const verifyGoogleAccessToken = async (accessToken: string): Promise<VerifiedGoogleAccount> => {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Invalid Google access token');
    const info: any = await res.json();
    if (!info?.sub || !info.email) throw new Error('Invalid Google token payload');
    if (!info.email_verified) throw new Error('Google email is not verified');

    const emailDomain = info.email.split('@')[1]?.toLowerCase();
    if (GOOGLE_ALLOWED_EMAIL_DOMAIN && emailDomain !== GOOGLE_ALLOWED_EMAIL_DOMAIN) {
        throw new Error(`Only ${GOOGLE_ALLOWED_EMAIL_DOMAIN} Google accounts are allowed`);
    }
    return {
        sub: info.sub,
        email: info.email.toLowerCase(),
        email_verified: Boolean(info.email_verified),
        name: info.name,
        picture: info.picture || null,
    };
};

const verifyGoogleAuthRequest = async (credential?: string): Promise<VerifiedGoogleAccount> => {
    if (!credential) throw new Error('Google credential is required');

    // If credential is a JWT (3 dot-separated parts), treat as ID token; otherwise treat as access token.
    const isJwt = credential.split('.').length === 3;
    if (isJwt) {
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
    }
    return verifyGoogleAccessToken(credential);
};

const notifyGoogleRegistration = async (user: UserRow): Promise<void> => {
    const formattedDate = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });

    // Case 4: User Notification
    await createNotification(
        user.id, 'user', '✅ [REGISTRATION SUCCESS]', `Selamat! Akun Anda telah berhasil dibuat.\nMetode : Google OAuth\nEmail : ${user.email}\nWaktu : ${formattedDate}`, 'system'
    );

    // Case 4: User Welcome Email
    try {
        const emailBody = `Assalamualaikum dan Salam Sejahtera ${user.full_name},

Tahniah! Akaun anda di E-CARE telah berjaya didaftarkan menggunakan akaun Google anda.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BUTIRAN AKAUN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nama Penuh    : ${user.full_name}
Emel          : ${user.email}
Kaedah Daftar : Google OAuth
Status Akaun  : ✅ Aktif
Tarikh Daftar : ${formattedDate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔑 Cara Log Masuk:
Anda tidak perlu kata laluan. Hanya klik butang 
"Log Masuk dengan Google" di laman web kami.

🚀 Mulakan sekarang:
Jika anda tidak membuat pendaftaran ini, sila hubungi kami segera.`;
        const emailHtml = buildNotificationEmailHtml(user.full_name, 'Selamat Datang ke portal E-CARE!', emailBody, undefined, 'user');
        await sendEmail(user.email!, 'Selamat Datang ke portal E-CARE!', emailHtml);
    } catch (emailErr) {
        console.error('Failed to send welcome email for Google user:', emailErr);
    }

    // Case 1: Admin Notification
    const [admins]: any = await pool.query('SELECT id FROM admins');
    if (admins && admins.length > 0) {
        await Promise.all(admins.map((admin: any) => createNotification(
            admin.id, 'admin', 'New User Registration', `${user.full_name} has just registered using Google.`, 'system'
        )));
    }
};

const buildOtpEmail = (name: string, otp: string) => `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 40px 0; width: 100%;">
        <div style="max-width: 600px; background-color: #ffffff; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; padding: 40px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; letter-spacing: 1px; text-transform: uppercase; color: #ffffff;">PTA E-CARE</h1>
                <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9; color: #ffffff;">Powered by DFKTVETMARABESUT</p>
            </div>
            <div style="padding: 40px; line-height: 1.6; color: #334155;">
                <h2 style="color: #1e293b; margin-top: 0;">Password Reset OTP</h2>
                <p>Hi ${escapeHtml(name || 'Customer')},</p>
                <p>Your password reset OTP is:</p>
                <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background-color: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; color: #1e3a8a; margin: 20px 0;">
                    ${otp}
                </div>
                <p>This OTP will expire in 15 minutes.</p>
            </div>
            <div style="background-color: #f1f5f9; padding: 30px; text-align: center; font-size: 12px; color: #64748b;">
                <p style="margin: 0 0 5px 0;">© 2026 <strong style="color: #1e3a8a;">DFKTVETMARABESUT</strong>. All rights reserved.</p>
                <p style="margin: 0;">Besut, Terengganu, Malaysia</p>
            </div>
        </div>
    </div>
`;

const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const buildWelcomeEmail = (name: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #111827; line-height: 1.6;">
        <div style="border: 1px solid #d1fae5; border-radius: 12px; overflow: hidden;">
            <div style="background: #0f766e; color: #ffffff; padding: 24px 28px;">
                <h1 style="margin: 0; font-size: 28px;">Welcome to E-CARE</h1>
            </div>
            <div style="padding: 28px;">
                <p style="margin-top: 0;">Hi ${escapeHtml(name || 'Customer')},</p>
                <p>Welcome to E-CARE. Your account has been registered successfully.</p>
            </div>
        </div>
    </div>
`;

const sendWelcomeEmail = async (user: UserRow): Promise<void> => {
    if (!user.email) return;
    await sendEmail(user.email, 'Welcome to E-CARE', buildWelcomeEmail(user.full_name));
};

export const buildUserSignupOtpEmailHtml = (email: string, otp: string) => {
    let baseUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : 'https://ptas.my';
    const confirmationUrl = `${baseUrl}/users/register?email=${encodeURIComponent(email)}&otp=${otp}`;
    return `
<div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 40px 0; width: 100%;">
    <div style="max-width: 600px; background-color: #ffffff; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; padding: 40px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; letter-spacing: 1px; text-transform: uppercase; color: #ffffff;">PTA E-CARE</h1>
            <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9; color: #ffffff;">Powered by DFKTVETMARABESUT</p>
        </div>
        <div style="padding: 40px; line-height: 1.6; color: #334155;">
            <p style="margin-top: 0;">Sahkan pendaftaran akaun dengan kod berikut:</p>
            <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background-color: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; color: #1e3a8a; margin: 20px 0;">${otp}</div>
            <p>atau klik di bawah untuk sahkan akaun anda:</p>
            <p style="text-align: center; margin: 25px 0;">
                <a href="${confirmationUrl}" style="background-color: #1e3a8a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Sahkan Akaun Saya</a>
            </p>
            <p>Kod OTP ini akan tamat tempoh dalam 15 minit.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Hantaran automatik portal E-Care. Sila abaikan jika bukan anda yang meminta kod ini.</p>
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
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; padding: 40px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; letter-spacing: 1px; text-transform: uppercase; color: #ffffff;">PTA E-CARE</h1>
                <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9; color: #ffffff;">Powered by DFKTVETMARABESUT</p>
            </div>
            <div style="padding: 30px;">
                <h2 style="color: #1e293b; margin-top: 0;">Aktifkan Akaun ${role === 'technician' ? 'Juruteknik' : 'Admin'} Anda</h2>
                <p>Hi ${escapeHtml(name)},</p>
                <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background-color: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; color: #1e3a8a; margin: 25px 0;">${otp}</div>
            </div>
            <div style="background-color: #f1f5f9; padding: 30px; text-align: center; font-size: 12px; color: #64748b;">
                <p style="margin: 0 0 5px 0;">© 2026 <strong style="color: #1e3a8a;">DFKTVETMARABESUT</strong>. All rights reserved.</p>
                <p style="margin: 0;">Besut, Terengganu, Malaysia</p>
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

        const [users]: any = await pool.query(
            'SELECT id, full_name, ic_number, contact_no, address, state FROM users WHERE ic_number = ?',
            [ic_number]
        );

        if (!users || users.length === 0) {
            res.status(404).json({ registered: false, error: 'Maaf, maklumat anda belum didaftar. Sila daftar dahulu.' });
            return;
        }

        const user = users[0];
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

        if (normalizedEmail && !(await isEmailAllowed(normalizedEmail))) {
            res.status(400).json({ error: 'Sila gunakan alamat e-mel yang sah. Domain e-mel ini tidak dibenarkan.' });
            return;
        }

        const [existing]: any = await pool.query('SELECT id FROM users WHERE ic_number = ?', [ic_number]);
        if (existing && existing.length > 0) {
            res.status(400).json({ error: 'IC number already registered' });
            return;
        }

        if (normalizedEmail) {
            const [existingEmail]: any = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
            if (existingEmail && existingEmail.length > 0) {
                res.status(400).json({ error: 'E-mel ini telah didaftarkan. Sila gunakan e-mel lain atau log masuk.' });
                return;
            }
        }

        const userId = randomUUID();
        const password_hash = await bcrypt.hash(password, 10);

        await pool.query(
            `INSERT INTO users (id, full_name, ic_number, email, contact_no, contact_no_2, address, state, password_hash, status, email_verified, auth_provider) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'password')`,
            [userId, full_name, ic_number, normalizedEmail || null, contact_no, contact_no_2 || null, address, state || null, password_hash, normalizedEmail ? 'Inactive' : 'Active', normalizedEmail ? 1 : 0]
        );

        const [newUserRows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        const user = newUserRows[0];
        
        const formattedDate = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });

        // Case 2: Admin Notification (Form Registration)
        const [admins]: any = await pool.query('SELECT id FROM admins');
        if (admins && admins.length > 0) {
            const adminMsg = `User: ${user.full_name}\nWaktu: ${formattedDate}\nMetode: Form Registrasi (Email/Password)\nStatus: ${normalizedEmail ? 'Menunggu Verifikasi' : 'Aktif'}`;
            await Promise.all(admins.map((admin: any) => createNotification(
                admin.id, 'admin', '🔔 [NEW USER REGISTRATION]', adminMsg, 'system'
            )));
        }

        if (normalizedEmail) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

            try {
                await pool.query('DELETE FROM password_resets WHERE user_id = ?', [userId]); // use password_resets for OTPs temporarily since activation_otps might be missing
                await pool.query('INSERT INTO password_resets (user_id, otp, expires_at) VALUES (?, ?, ?)', [userId, otp, expires_at]);
            } catch (err) {
                console.error('Failed to create OTP record', err);
            }

            try {
                const emailHtml = buildUserSignupOtpEmailHtml(normalizedEmail, otp);
                await sendEmail(normalizedEmail, 'Sahkan Pendaftaran Akaun E-CARE', emailHtml);
            } catch (emailError) {
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
            const tokenPayload = { id: user.id, role: 'user', ic_number: user.ic_number };
            const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

            // Case 5: User Notification (Form Registration - No Email)
            await createNotification(
                user.id, 'user', '👋 Selamat Datang!', `~ Selamat datang, ${user.full_name}!\nAkaun anda telah berjaya didaftarkan dan aktif.`, 'system'
            );

            res.status(200).json({
                message: 'Pendaftaran berjaya! Akaun anda telah diaktifkan.',
                user: stripPasswordHash(user),
                requires_otp: false,
                token
            });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const verifySignupOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, otp } = req.body;
        const normalizedEmail = email.trim().toLowerCase();

        const [users]: any = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
        if (users.length === 0) { res.status(404).json({ error: 'User not found' }); return; }
        const userId = users[0].id;

        const [otpRecords]: any = await pool.query('SELECT * FROM password_resets WHERE user_id = ? AND otp = ?', [userId, otp.trim()]);
        if (!otpRecords || otpRecords.length === 0) {
            res.status(400).json({ error: 'Kod OTP tidak sah atau telah tamat tempoh' });
            return;
        }

        await pool.query('UPDATE users SET status = "Active", email_verified = 1 WHERE id = ?', [userId]);
        await pool.query('DELETE FROM password_resets WHERE id = ?', [otpRecords[0].id]);

        const [updatedUsers]: any = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        const user = updatedUsers[0];

        try { await sendWelcomeEmail(user); } catch (e) { }

        // Case 5: User Notification (Form Registration - Verified Email)
        await createNotification(
            user.id, 'user', '👋 Selamat Datang!', `~ Selamat datang, ${user.full_name}!\nAkaun anda telah berjaya didaftarkan dan aktif.`, 'system'
        );

        const token = createUserToken(user);

        res.json({ message: 'Akaun berjaya disahkan dan diaktifkan!', user: stripPasswordHash(user), token, role: 'user' });
    } catch (error) {
        console.error('Verify signup OTP error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const resendSignupOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        if (!email) { res.status(400).json({ error: 'E-mel diperlukan' }); return; }
        const normalizedEmail = email.trim().toLowerCase();

        const [users]: any = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
        if (users.length === 0) { res.status(404).json({ error: 'User not found' }); return; }
        const userId = users[0].id;

        await pool.query('DELETE FROM password_resets WHERE user_id = ?', [userId]);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

        await pool.query('INSERT INTO password_resets (user_id, otp, expires_at) VALUES (?, ?, ?)', [userId, otp, expires_at]);

        try {
            const emailHtml = buildUserSignupOtpEmailHtml(normalizedEmail, otp);
            await sendEmail(normalizedEmail, 'Sahkan Pendaftaran Akaun E-CARE', emailHtml);
        } catch (emailError: any) {
            console.error('Resend OTP email failed:', emailError?.message || emailError);
            res.status(500).json({ error: 'Gagal menghantar kod OTP ke e-mel anda. Sila cuba lagi.' });
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

        const [profiles]: any = await pool.query(`SELECT * FROM ${table} WHERE username = ?`, [username]);
        if (profiles.length === 0) { res.status(404).json({ error: 'Akaun tidak ditemui' }); return; }
        const profile = profiles[0];

        const [otpRecords]: any = await pool.query('SELECT * FROM password_resets WHERE user_id = ? AND otp = ?', [profile.id, otp]);
        if (!otpRecords || otpRecords.length === 0) {
            res.status(400).json({ error: 'Kod OTP tidak sah atau telah tamat tempoh' });
            return;
        }

        await pool.query(`UPDATE ${table} SET is_active = 1 WHERE id = ?`, [profile.id]);
        await pool.query('DELETE FROM password_resets WHERE id = ?', [otpRecords[0].id]);

        const tokenPayload = role === 'admin' ? { id: profile.id, role: 'admin', username: profile.username } : { id: profile.id, role: 'technician', username: profile.username };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
        const { password_hash, ...userWithoutPassword } = profile;

        res.json({ message: 'Akaun berjaya diaktifkan!', user: userWithoutPassword, token, role });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const resendActivationOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, role } = req.body;
        const table = role === 'technician' ? 'technicians' : 'admins';

        const [profiles]: any = await pool.query(`SELECT * FROM ${table} WHERE username = ?`, [username]);
        if (profiles.length === 0) { res.status(404).json({ error: 'Akaun tidak ditemui' }); return; }
        const profile = profiles[0];

        const name = role === 'technician' ? profile.name : profile.admin_name;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

        await pool.query('DELETE FROM password_resets WHERE user_id = ?', [profile.id]);
        await pool.query('INSERT INTO password_resets (user_id, otp, expires_at) VALUES (?, ?, ?)', [profile.id, otp, expiresAt]);

        const activationHtml = buildActivationEmail(name, otp, role);
        await sendEmail(profile.email, `Aktifkan Akaun ${role === 'technician' ? 'Juruteknik' : 'Admin'} e-Care Anda`, activationHtml);

        res.json({ message: 'Kod OTP baharu telah dihantar ke e-mel berdaftar anda.' });
    } catch (error) {
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
            res.status(401).json({ error: String(error?.message || 'Invalid Google credential') });
            return;
        }

        const googleSub = googleAccount.sub;
        const googleEmail = googleAccount.email;
        const googleName = String(full_name || googleAccount.name || googleEmail.split('@')[0]).trim();

        const [users]: any = await pool.query('SELECT * FROM users WHERE google_sub = ? OR email = ? LIMIT 1', [googleSub, googleEmail]);
        let user = users[0];

        if (intent === 'register') {
            if (user) { res.status(400).json({ error: 'Akaun email ini sudah didaftarkan. Sila Log In.', redirect_to_login: true }); return; }

            if (ic_number && contact_no && address) {
                const [existingIc]: any = await pool.query('SELECT id FROM users WHERE ic_number = ?', [ic_number]);
                if (existingIc.length > 0) { res.status(400).json({ error: 'IC number already registered.' }); return; }

                const userId = randomUUID();
                const password_hash = await bcrypt.hash(`google:${googleSub}:${randomUUID()}`, 10);
                await pool.query(
                    `INSERT INTO users (id, full_name, ic_number, email, contact_no, contact_no_2, address, state, password_hash, status, google_sub, auth_provider, email_verified) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, 'google', 1)`,
                    [userId, googleName, ic_number, googleEmail, contact_no, contact_no_2 || null, address, state || null, password_hash, googleSub]
                );

                const [newUserRows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
                const newUser = newUserRows[0];

                try { await notifyGoogleRegistration(newUser); } catch (e) {}
                try { await sendWelcomeEmail(newUser); } catch (e) {}

                res.status(201).json({ message: 'Google registration successful', user: stripPasswordHash(newUser), token: createUserToken(newUser), role: 'user', is_new_user: true, profile_complete: true });
                return;
            }

            const placeholderIc = `G-${randomUUID().replace(/-/g, '').substring(0, 10)}`;
            const userId = randomUUID();
            const password_hash = await bcrypt.hash(`google:${googleSub}:${randomUUID()}`, 10);
            
            await pool.query(
                `INSERT INTO users (id, full_name, ic_number, email, contact_no, address, password_hash, status, google_sub, auth_provider, email_verified) 
                VALUES (?, ?, ?, ?, '0000000000', 'Pending', ?, 'Active', ?, 'google', 1)`,
                [userId, googleName, placeholderIc, googleEmail, password_hash, googleSub]
            );

            const [newUserRows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
            const newUser = newUserRows[0];

            res.status(201).json({ message: 'Google registration successful — please complete profile', user: stripPasswordHash(newUser), token: createUserToken(newUser), role: 'user', is_new_user: true, profile_complete: false, redirect_to_profile: true });
            return;
        }

        if (intent === 'login' || user) {
            if (!user) { res.status(404).json({ error: 'Akaun tidak ditemui. Sila Sign Up.', redirect_to_register: true }); return; }
            if (!isActiveUser(user.status)) { res.status(403).json({ error: 'Account is not active.' }); return; }

            await pool.query('UPDATE users SET google_sub = ?, auth_provider = "google", email_verified = 1 WHERE id = ?', [googleSub, user.id]);
            const [updatedUsers]: any = await pool.query('SELECT * FROM users WHERE id = ?', [user.id]);
            const activeUser = updatedUsers[0];

            res.json({ message: 'Google login successful', user: stripPasswordHash(activeUser), token: createUserToken(activeUser), role: 'user', is_new_user: false, profile_complete: !activeUser.ic_number.startsWith('G-'), redirect_to_profile: activeUser.ic_number.startsWith('G-') });
            return;
        }

        res.status(400).json({ error: 'Please complete profile before Google registration', requires_profile: true, google_profile: { full_name: googleName, email: googleEmail } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ic_number, username, password, role } = req.body;
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        let user: any = null;
        let tokenPayload: any = null;
        let userIdToLog: any = null;
        let usernameToLog = ic_number || username;

        if (role === 'user') {
            if (!ic_number) { res.status(400).json({ error: 'IC number is required' }); return; }
            const [users]: any = await pool.query('SELECT * FROM users WHERE ic_number = ?', [ic_number]);
            if (users.length === 0) { 
                try { await pool.query('INSERT INTO user_logs (username, user_ip, success) VALUES (?, ?, 0)', [ic_number, clientIp]); } catch (e) {}
                res.status(401).json({ error: 'Invalid IC number or password' }); return; 
            }
            user = users[0];
            userIdToLog = user.id;
            tokenPayload = { id: user.id, role: 'user', ic_number: user.ic_number };
        } else if (role === 'admin') {
            if (!username) { res.status(400).json({ error: 'Username is required' }); return; }
            const [admins]: any = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
            if (admins.length === 0) { res.status(401).json({ error: 'Invalid username or password' }); return; }
            user = admins[0];
            tokenPayload = { id: user.id, role: 'admin', username: user.username };
        } else if (role === 'technician') {
            if (!username) { res.status(400).json({ error: 'Username is required' }); return; }
            const [techs]: any = await pool.query('SELECT * FROM technicians WHERE username = ?', [username]);
            if (techs.length === 0) { res.status(401).json({ error: 'Invalid username or password' }); return; }
            user = techs[0];
            tokenPayload = { id: user.id, role: 'technician', username: user.username };
        } else if (role === 'main_technician') {
            if (!username) { res.status(400).json({ error: 'Username/Email is required' }); return; }
            const [techs]: any = await pool.query('SELECT * FROM technicians WHERE username = ? OR email = ?', [username, username]);
            if (techs.length === 0 || techs[0].email !== 'technicianasign@gmail.com') { res.status(401).json({ error: 'Invalid credentials' }); return; }
            user = techs[0];
            tokenPayload = { id: user.id, role: 'main_technician', username: user.username };
        } else {
            res.status(400).json({ error: 'Invalid role' }); return;
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            if (role === 'user') {
                try { await pool.query('INSERT INTO user_logs (user_id, username, user_ip, success) VALUES (?, ?, ?, 0)', [userIdToLog, usernameToLog, clientIp]); } catch (e) {}
            }
            res.status(401).json({ error: 'Invalid credentials' }); return;
        }

        if (role === 'user') {
            if (user.status !== 'Active' && user.status !== 'active') {
                await pool.query('UPDATE users SET status = "Active", email_verified = 1 WHERE id = ?', [user.id]);
            }
            try { await pool.query('INSERT INTO user_logs (user_id, username, user_ip, success) VALUES (?, ?, ?, 1)', [userIdToLog, usernameToLog, clientIp]); } catch (e) {}
        } else if (role === 'technician') {
            if (!user.is_active) {
                // Auto-activate technician without OTP
                await pool.query('UPDATE technicians SET is_active = 1 WHERE id = ?', [user.id]);
                user.is_active = 1;
            }
        } else if (role === 'admin') {
            if (!user.is_active) {
                const [otpRecords]: any = await pool.query('SELECT * FROM password_resets WHERE user_id = ? AND expires_at >= NOW()', [user.id]);
                if (otpRecords.length > 0) {
                    res.status(403).json({ error: 'Akaun anda belum diaktifkan.', requires_activation: true, email: user.email, username: user.username, role });
                    return;
                }
                res.status(403).json({ error: 'Akaun anda tidak aktif. Sila hubungi pentadbir.' }); return;
            }
        }

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
        const { password_hash, ...userWithoutPassword } = user;
        res.json({ message: 'Login successful', user: userWithoutPassword, token, role });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ic_number, email } = req.body;
        let users: any = [];
        if (ic_number) {
            [users] = await pool.query('SELECT id, email, full_name FROM users WHERE ic_number = ?', [ic_number]);
        } else if (email) {
            [users] = await pool.query('SELECT id, email, full_name FROM users WHERE email = ?', [email]);
        }

        const user = users[0];
        if (!user) { res.status(404).json({ error: 'User not found' }); return; }
        if (!user.email) { res.status(400).json({ error: 'No email associated with this account' }); return; }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

        await pool.query('DELETE FROM password_resets WHERE user_id = ?', [user.id]);
        await pool.query('INSERT INTO password_resets (user_id, otp, expires_at) VALUES (?, ?, ?)', [user.id, otp, expiresAt]);

        await sendEmail(user.email, 'E-CARE Password Reset OTP', buildOtpEmail(user.full_name, otp));
        res.json({ message: 'OTP sent to your email', email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ic_number, email, otp } = req.body;
        let users: any = [];
        if (ic_number) [users] = await pool.query('SELECT id FROM users WHERE ic_number = ?', [ic_number]);
        else if (email) [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        const user = users[0];

        if (!user) { res.status(404).json({ error: 'User not found' }); return; }

        const [otpRecords]: any = await pool.query('SELECT * FROM password_resets WHERE user_id = ? AND otp = ? AND expires_at >= NOW()', [user.id, otp]);
        if (otpRecords.length === 0) { res.status(400).json({ error: 'Invalid or expired OTP' }); return; }

        res.json({ message: 'OTP verified', valid: true });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ic_number, email, otp, new_password } = req.body;
        let users: any = [];
        if (ic_number) [users] = await pool.query('SELECT id FROM users WHERE ic_number = ?', [ic_number]);
        else if (email) [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        const user = users[0];

        if (!user) { res.status(404).json({ error: 'User not found' }); return; }

        const [otpRecords]: any = await pool.query('SELECT * FROM password_resets WHERE user_id = ? AND otp = ? AND expires_at >= NOW()', [user.id, otp]);
        if (otpRecords.length === 0) { res.status(400).json({ error: 'Invalid or expired OTP' }); return; }

        const password_hash = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, user.id]);
        await pool.query('DELETE FROM password_resets WHERE user_id = ?', [user.id]);

        res.json({ message: 'Password reset successful' });
    } catch (error) {
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
        if (role === 'main_technician') table = 'technicians';

        const [rows]: any = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [userId]);
        if (rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }

        const { password_hash, ...userWithoutPassword } = rows[0];
        res.json({ user: userWithoutPassword, role });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
