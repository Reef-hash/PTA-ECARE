import nodemailer from 'nodemailer';

const getSmtpConfig = () => {
    const host = process.env.SMTP_HOST || process.env.MAIL_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || process.env.MAIL_PORT || '587', 10);
    const encryption = (process.env.MAIL_ENCRYPTION || '').toLowerCase();
    const secure = process.env.SMTP_SECURE === 'true' || encryption === 'ssl' || port === 465;
    const user = process.env.SMTP_USER || process.env.MAIL_USERNAME || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.MAIL_PASSWORD || process.env.EMAIL_PASS;
    const fromName = process.env.SMTP_FROM_NAME || process.env.MAIL_FROM_NAME || 'E-CARE System';
    const fromEmail = process.env.SMTP_FROM || process.env.MAIL_FROM_ADDRESS || user;

    return { host, port, secure, user, pass, fromName, fromEmail };
};

export const sendEmail = async (to: string, subject: string, html: string) => {
    const smtp = getSmtpConfig();

    if (!smtp.user || !smtp.pass) {
        throw new Error('SMTP credentials are required to send email');
    }

    try {
        const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            auth: {
                user: smtp.user,
                pass: smtp.pass,
            },
        });

        const info = await transporter.sendMail({
            from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
            to,
            subject,
            html,
        });
        console.log(`Email sent: ${info.messageId}`);
    } catch (error: any) {
        const errMsg = error?.message || String(error);
        console.error('Error sending email:', errMsg, error);
        throw new Error(`Failed to send email: ${errMsg}`);
    }
};

export const isEmailAllowed = async (email: string | null | undefined): Promise<boolean> => {
    if (!email) return true; // empty email is allowed if it's optional
    
    const lowerEmail = email.toLowerCase().trim();
    
    // Exception for the one current fake email as requested
    if (lowerEmail === 'tech1@ptaservices.com') {
        return true;
    }
    
    const domain = lowerEmail.split('@')[1];
    if (!domain) return false;
    
    // 1. Whitelist check (filters out 99.9% of disposable and fake domains)
    const allowedDomains = [
        'gmail.com',
        'yahoo.com',
        'hotmail.com',
        'outlook.com',
        'icloud.com',
        'live.com',
        'ymail.com',
        'gmx.com',
        'mail.com',
        'zoho.com',
        'proton.me',
        'protonmail.com',
        // Official/Corporate domains
        'mara.gov.my',
        'ikm.edu.my'
    ];
    
    if (!allowedDomains.includes(domain)) {
        return false;
    }
    
    // 2. Library check (as requested by user)
    try {
        const moduleName = 'disposable-email-detector';
        const disposable = await import(moduleName);
        const detector = typeof disposable.default === 'function' ? disposable.default : disposable.default.default;
        const isDisposable = await detector(lowerEmail);
        if (isDisposable) {
            return false;
        }
    } catch (err) {
        // If the library fails for some reason, fallback to allowing whitelist email
        console.error('Disposable email detector error:', err);
    }
    
    return true;
};
