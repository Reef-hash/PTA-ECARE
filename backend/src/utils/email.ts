import { Resend } from 'resend';

const getEmailConfig = () => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromName = process.env.SMTP_FROM_NAME || process.env.MAIL_FROM_NAME || 'E-CARE System';
    // When domain is verified, we can use the domain emails. Fallback to a placeholder if not set.
    const fromEmail = process.env.SMTP_FROM || process.env.MAIL_FROM_ADDRESS || 'onboarding@resend.dev';
    
    return { apiKey, fromName, fromEmail };
};

export const sendEmail = async (to: string, subject: string, html: string) => {
    const config = getEmailConfig();

    if (!config.apiKey) {
        throw new Error('RESEND_API_KEY is required to send email');
    }

    try {
        const resend = new Resend(config.apiKey);
        
        const data = await resend.emails.send({
            from: `${config.fromName} <${config.fromEmail}>`,
            to: [to],
            replyTo: config.fromEmail,
            subject: subject,
            html: html,
            headers: {
                'X-Entity-Ref-ID': Date.now().toString(),
            }
        });

        if (data.error) {
            throw new Error(data.error.message);
        }

        console.log(`Email sent via Resend: ${data.data?.id}`);
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
