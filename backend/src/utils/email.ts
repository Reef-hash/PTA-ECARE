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
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
};
