import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { randomUUID } from 'crypto';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { createNotification } from './notifications.controller.js';
import { sendEmail } from '../utils/email.js';

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

    const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
        throw new Error('Invalid Google token payload');
    }

    if (!payload.email_verified) {
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

const verifySupabaseGoogleSession = async (accessToken: string): Promise<VerifiedGoogleAccount> => {
    console.log('[GOOGLE AUTH] Verifying Supabase access token, length:', accessToken.length);
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !data.user) {
        console.error('[GOOGLE AUTH] supabaseAdmin.auth.getUser FAILED:', error?.message || 'No user returned');
        throw new Error('Invalid Supabase Google session');
    }
    console.log('[GOOGLE AUTH] Supabase user verified:', data.user.email);

    const authUser: any = data.user;
    const identities = Array.isArray(authUser.identities) ? authUser.identities : [];
    const googleIdentity = identities.find((identity: any) => identity.provider === 'google') || identities[0];
    const identityData = googleIdentity?.identity_data || {};
    const provider = googleIdentity?.provider || authUser.app_metadata?.provider;
    const providers = authUser.app_metadata?.providers || [];

    if (provider !== 'google' && !providers.includes('google')) {
        throw new Error('Supabase session is not a Google account');
    }

    const email = String(authUser.email || identityData.email || authUser.user_metadata?.email || '').toLowerCase();
    if (!email) {
        throw new Error('Google email is missing from Supabase session');
    }

    const emailVerified = Boolean(
        identityData.email_verified
        ?? authUser.user_metadata?.email_verified
        ?? authUser.email_confirmed_at
    );

    if (!emailVerified) {
        throw new Error('Google email is not verified');
    }

    ensureAllowedGoogleEmail(email);

    return {
        sub: String(identityData.sub || identityData.provider_id || googleIdentity?.id || authUser.id),
        email,
        email_verified: emailVerified,
        name: String(identityData.name || identityData.full_name || authUser.user_metadata?.name || authUser.user_metadata?.full_name || email.split('@')[0]),
        picture: identityData.picture || identityData.avatar_url || authUser.user_metadata?.picture || authUser.user_metadata?.avatar_url || null,
    };
};

const verifyGoogleAuthRequest = async (credential?: string, supabaseAccessToken?: string): Promise<VerifiedGoogleAccount> => {
    if (supabaseAccessToken) {
        return verifySupabaseGoogleSession(supabaseAccessToken);
    }

    if (!credential) {
        throw new Error('Google credential or Supabase access token is required');
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
        'system'
    );

    const { data: admins } = await supabaseAdmin.from('admins').select('id');
    if (admins && admins.length > 0) {
        await Promise.all(admins.map((admin: any) => createNotification(
            admin.id,
            'admin',
            'New Google User Registration',
            `A new Google/Gmail user has successfully registered.\nName: ${user.full_name} | IC Number: ${user.ic_number}\nClick here to view details.| uid:${user.id}`,
            'system'
        )));
    }

    const { data: technicians } = await supabaseAdmin
        .from('technicians')
        .select('id')
        .eq('is_active', true);

    if (technicians && technicians.length > 0) {
        await Promise.all(technicians.map((technician: any) => createNotification(
            technician.id,
            'technician',
            'New Google Customer Registered',
            `A new Google/Gmail customer has registered: ${user.full_name}.`,
            'system'
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
                    eCare: Track your repair from start to finish. Receive live updates on your repair progress and get notified the moment it's ready for pickup.
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

export const verifyIC = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ic_number } = req.body;
        if (!ic_number || ic_number.length !== 12) {
            res.status(400).json({ error: 'No IC mestilah 12 digit' });
            return;
        }

        const { data, error } = await supabaseAdmin
            .from('users')
            .select('id, full_name, ic_number, contact_no, address, state')
            .eq('ic_number', ic_number);

        if (error || !data || data.length === 0) {
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

        const { data: existing } = await supabaseAdmin.from('users').select('id').eq('ic_number', ic_number);
        if (existing && existing.length > 0) {
            res.status(400).json({ error: 'IC number already registered' });
            return;
        }

        const password_hash = await bcrypt.hash(password, 10);
        const { data: result, error } = await supabaseAdmin.from('users').insert({
            full_name, ic_number, email: email || null, contact_no, contact_no_2: contact_no_2 || null, address, state: state || null, password_hash
        }).select();

        if (error || !result) {
            throw error;
        }

        const user = result[0];

        // Notify Admins
        try {
            const { data: admins } = await supabaseAdmin.from('admins').select('id');
            if (admins && admins.length > 0) {
                const notifications = admins.map((admin: any) => ({
                    recipient_id: admin.id,
                    recipient_role: 'admin',
                    title: 'New User Registration',
                    message: `A new user has successfully registered.\nName: ${user.full_name} | IC Number: ${user.ic_number}\nClick here to view details.| uid:${user.id}`,
                    type: 'system',
                    is_read: false
                }));
                await supabaseAdmin.from('notifications').insert(notifications);
            }
        } catch (notifyError) {
            console.error('Failed to notify admins:', notifyError);
        }

        try {
            await sendWelcomeEmail(user as UserRow);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
        }

        const token = jwt.sign({ id: user.id, role: 'user', ic_number: user.ic_number }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
        res.status(201).json({ message: 'Registration successful', user: { id: user.id, full_name: user.full_name, ic_number: user.ic_number, email: user.email }, token });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
    try {
        const { credential, supabase_access_token, full_name, ic_number, contact_no, contact_no_2, address, state, intent } = req.body;
        let googleAccount: VerifiedGoogleAccount;

        try {
            googleAccount = await verifyGoogleAuthRequest(credential, supabase_access_token);
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
        const { data: googleUsers, error: googleLookupError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('google_sub', googleSub)
            .limit(1);

        if (googleLookupError) {
            if (isMissingGoogleAuthColumn(googleLookupError)) {
                res.status(500).json({ error: 'Google auth database fields are missing. Run supabase/add_google_auth_fields.sql first.' });
                return;
            }
            throw googleLookupError;
        }

        let user = (googleUsers?.[0] as UserRow | undefined) || null;

        // --- Fallback: look up by email ---
        if (!user) {
            const { data: emailUsers, error: emailLookupError } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('email', googleEmail)
                .limit(1);

            if (emailLookupError) throw emailLookupError;
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
                const { data: existingIc } = await supabaseAdmin
                    .from('users')
                    .select('id')
                    .eq('ic_number', ic_number)
                    .limit(1);

                if (existingIc && existingIc.length > 0) {
                    res.status(400).json({ error: 'IC number already registered. Please use a different IC number.' });
                    return;
                }

                const password_hash = await bcrypt.hash(`google:${googleSub}:${randomUUID()}`, 10);
                const { data: result, error: insertError } = await supabaseAdmin.from('users').insert({
                    full_name: googleName,
                    ic_number,
                    email: googleEmail,
                    contact_no,
                    contact_no_2: contact_no_2 || null,
                    address,
                    state: state || null,
                    password_hash,
                    google_sub: googleSub,
                    auth_provider: 'google',
                    email_verified: true,
                    google_picture: googlePicture
                }).select();

                if (insertError || !result) {
                    if (isMissingGoogleAuthColumn(insertError)) {
                        res.status(500).json({ error: 'Google auth database fields are missing. Run supabase/add_google_auth_fields.sql first.' });
                        return;
                    }
                    throw insertError;
                }

                const newUser = result[0] as UserRow;

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
            const password_hash = await bcrypt.hash(`google:${googleSub}:${randomUUID()}`, 10);
            const { data: result, error: insertError } = await supabaseAdmin.from('users').insert({
                full_name: googleName,
                ic_number: placeholderIc,
                email: googleEmail,
                contact_no: '0000000000',
                address: 'Pending',
                password_hash,
                google_sub: googleSub,
                auth_provider: 'google',
                email_verified: true,
                google_picture: googlePicture
            }).select();

            if (insertError || !result) {
                if (isMissingGoogleAuthColumn(insertError)) {
                    res.status(500).json({ error: 'Google auth database fields are missing. Run supabase/add_google_auth_fields.sql first.' });
                    return;
                }
                throw insertError;
            }

            const newUser = result[0] as UserRow;

            try { await notifyGoogleRegistration(newUser); } catch (e) { console.error('Notify error:', e); }
            try { await sendWelcomeEmail(newUser); } catch (e) { console.error('Welcome email error:', e); }

            const token = createUserToken(newUser);
            res.status(201).json({
                message: 'Google registration successful — please complete profile',
                user: stripPasswordHash(newUser),
                token,
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

            const { data: updatedUser, error: updateError } = await supabaseAdmin
                .from('users')
                .update(updates)
                .eq('id', user.id)
                .select()
                .single();

            if (updateError) {
                if (isMissingGoogleAuthColumn(updateError)) {
                    res.status(500).json({ error: 'Google auth database fields are missing. Run supabase/add_google_auth_fields.sql first.' });
                    return;
                }
                throw updateError;
            }

            const activeUser = updatedUser as UserRow;
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
            if (!isActiveUser(user.status)) {
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

            const { data: updatedUser, error: updateError } = await supabaseAdmin
                .from('users')
                .update(updates)
                .eq('id', user.id)
                .select()
                .single();

            if (updateError) {
                if (isMissingGoogleAuthColumn(updateError)) {
                    res.status(500).json({ error: 'Google auth database fields are missing. Run supabase/add_google_auth_fields.sql first.' });
                    return;
                }
                throw updateError;
            }

            const activeUser = updatedUser as UserRow;
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

        const { data: existingIc } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('ic_number', ic_number)
            .limit(1);

        if (existingIc && existingIc.length > 0) {
            res.status(400).json({ error: 'IC number already registered. Please login with your existing account or contact administrator.' });
            return;
        }

        const password_hash = await bcrypt.hash(`google:${googleSub}:${randomUUID()}`, 10);
        const { data: result, error: insertError } = await supabaseAdmin.from('users').insert({
            full_name: googleName,
            ic_number,
            email: googleEmail,
            contact_no,
            contact_no_2: contact_no_2 || null,
            address,
            state: state || null,
            password_hash,
            google_sub: googleSub,
            auth_provider: 'google',
            email_verified: true,
            google_picture: googlePicture
        }).select();

        if (insertError || !result) {
            if (isMissingGoogleAuthColumn(insertError)) {
                res.status(500).json({ error: 'Google auth database fields are missing. Run supabase/add_google_auth_fields.sql first.' });
                return;
            }
            throw insertError;
        }

        const newUser = result[0] as UserRow;

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
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Internal server error' });
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
            const { data, error: queryError } = await supabaseAdmin.from('users').select('*').eq('ic_number', ic_number);
            console.log(`[LOGIN] User query result: found=${data?.length}, error=${queryError?.message}`);
            if (!data || data.length === 0) {
                try { await supabaseAdmin.from('user_logs').insert({ username: ic_number, user_ip: clientIp, success: false }); } catch (e) { console.log('[LOGIN] user_logs insert error (ignored):', e); }
                res.status(401).json({ error: 'Invalid IC number or password' }); return;
            }
            console.log(`[LOGIN] User status: ${data[0].status}`);
            if (data[0].status !== 'Active' && data[0].status !== 'active') { // Note status is lowercase 'active' in mock data
                res.status(403).json({ error: 'Account is not active. Please contact administrator.' }); return;
            }
            user = data[0];
            tokenPayload = { id: user.id, role: 'user', ic_number: user.ic_number };
        } else if (role === 'admin') {
            if (!username) { res.status(400).json({ error: 'Username is required' }); return; }
            const { data } = await supabaseAdmin.from('admins').select('*').eq('username', username);
            if (!data || data.length === 0) { res.status(401).json({ error: 'Invalid username or password' }); return; }
            user = data[0];
            tokenPayload = { id: user.id, role: 'admin', username: user.username };
        } else if (role === 'technician') {
            if (!username) { res.status(400).json({ error: 'Username is required' }); return; }
            const { data } = await supabaseAdmin.from('technicians').select('*').eq('username', username);
            if (!data || data.length === 0) { res.status(401).json({ error: 'Invalid username or password' }); return; }
            if (!data[0].is_active) { res.status(403).json({ error: 'Account is not active' }); return; }
            user = data[0];
            tokenPayload = { id: user.id, role: 'technician', username: user.username };
        }

        console.log(`[LOGIN] Comparing password for user: ${user?.id}`);
        const validPassword = await bcrypt.compare(password, user.password_hash);
        console.log(`[LOGIN] Password valid: ${validPassword}`);
        if (!validPassword) {
            if (role === 'user') {
                try { await supabaseAdmin.from('user_logs').insert({ user_id: user.id, username: ic_number || username, user_ip: clientIp, success: false }); } catch (e) { console.log('[LOGIN] user_logs insert error (ignored):', e); }
            }
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        if (role === 'user') {
            try { await supabaseAdmin.from('user_logs').insert({ user_id: user.id, username: ic_number, user_ip: clientIp, success: true }); } catch (e) { console.log('[LOGIN] user_logs insert error (ignored):', e); }
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
        let query = supabaseAdmin.from('users').select('id, email, full_name');
        if (ic_number) query = query.eq('ic_number', ic_number);
        else if (email) query = query.eq('email', email);

        const { data } = await query;
        const user = data && data[0] ? data[0] : null;

        if (!user) { res.status(404).json({ error: 'User not found' }); return; }
        if (!user.email) { res.status(400).json({ error: 'No email associated with this account' }); return; }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        await supabaseAdmin.from('password_resets').delete().eq('user_id', user.id);
        await supabaseAdmin.from('password_resets').insert({ user_id: user.id, otp, expires_at: expiresAt });

        try {
            await sendEmail(
                user.email,
                'E-CARE Password Reset OTP',
                buildOtpEmail(user.full_name, otp)
            );
        } catch (emailError) {
            await supabaseAdmin.from('password_resets').delete().eq('user_id', user.id);
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
        let query = supabaseAdmin.from('users').select('id');
        if (ic_number) query = query.eq('ic_number', ic_number);
        else if (email) query = query.eq('email', email);

        const { data: users } = await query;
        const userId = users && users[0] ? users[0].id : null;

        if (!userId) { res.status(404).json({ error: 'User not found' }); return; }

        const { data: resetRows } = await supabaseAdmin.from('password_resets').select('*').eq('user_id', userId).eq('otp', otp);
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
        let query = supabaseAdmin.from('users').select('id');
        if (ic_number) query = query.eq('ic_number', ic_number);
        else if (email) query = query.eq('email', email);

        const { data: users } = await query;
        const userId = users && users[0] ? users[0].id : null;

        if (!userId) { res.status(404).json({ error: 'User not found' }); return; }

        const { data: resetRows } = await supabaseAdmin.from('password_resets').select('*').eq('user_id', userId).eq('otp', otp);
        if (!resetRows || resetRows.length === 0 || new Date(resetRows[0].expires_at) < new Date()) {
            res.status(400).json({ error: 'Invalid or expired OTP' }); return;
        }

        const password_hash = await bcrypt.hash(new_password, 10);
        await supabaseAdmin.from('users').update({ password_hash, updated_at: new Date().toISOString() }).eq('id', userId);
        await supabaseAdmin.from('password_resets').delete().eq('user_id', userId);

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

        const { data } = await supabaseAdmin.from(table).select('*').eq('id', userId);

        if (!data || data.length === 0) { res.status(404).json({ error: 'User not found' }); return; }

        const { password_hash, ...userWithoutPassword } = data[0];
        res.json({ user: userWithoutPassword, role });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
