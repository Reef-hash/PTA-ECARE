import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Hostinger env
dotenv.config({ path: path.resolve(__dirname, '.env.hostinger') });

const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = parseInt(process.env.SMTP_PORT || '587', 10);
const secure = process.env.SMTP_SECURE === 'true' || port === 465;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const fromName = process.env.SMTP_FROM_NAME || 'E-CARE System';
const fromEmail = process.env.SMTP_FROM || user;

const recipient = 'aiskrimgoreng77@gmail.com';

console.log('--- E-CARE SMTP Verify + Send Test ---');
console.log(`Host: ${host}:${port} (secure=${secure})`);
console.log(`User: ${user}`);
console.log(`Pass length: ${pass ? pass.length : 0} chars`);
console.log(`From: "${fromName}" <${fromEmail}>`);
console.log(`To:   ${recipient}`);
console.log('');

if (!user || !pass) {
    console.error('FAIL: SMTP_USER / SMTP_PASS missing in env');
    process.exit(1);
}

const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
});

console.log('[1/2] Verifying SMTP connection...');
try {
    await transporter.verify();
    console.log('  OK: SMTP connection verified - credentials accepted.');
} catch (err) {
    console.error('  FAIL: SMTP verification failed.');
    console.error('  Error:', err.message);
    console.error('');
    console.error('  Most likely cause: Gmail requires a 16-character App Password');
    console.error('  (regular account password is rejected if 2FA is on).');
    process.exit(2);
}

console.log('[2/2] Sending test email...');
try {
    const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: recipient,
        subject: '[E-CARE] Test Email Notification',
        html: `
<div style="font-family:Segoe UI,Arial,sans-serif;background:#f8faffc;padding:40px 0;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;padding:30px;text-align:center;">
      <h1 style="margin:0;font-size:26px;letter-spacing:1px;">E-CARE</h1>
      <p style="margin:5px 0 0;font-size:13px;opacity:.9;">Email Notification Test</p>
    </div>
    <div style="padding:30px;line-height:1.6;color:#334155;">
      <h2 style="color:#1e293b;margin-top:0;">Test Email Berjaya</h2>
      <p>Emel ini dihantar sebagai ujian konfigurasi nodemailer dari backend E-CARE (Hostinger env).</p>
      <p>Sekiranya anda menerima emel ini, konfigurasi SMTP berfungsi dengan betul.</p>
      <p style="font-size:12px;color:#94a3b8;">Timestamp: ${new Date().toISOString()}</p>
    </div>
    <div style="background:#f1f5f9;padding:20px;text-align:center;font-size:11px;color:#64748b;">
      &copy; 2026 DFKTVETMARABESUT
    </div>
  </div>
</div>`,
        headers: { 'X-Entity-Ref-ID': Date.now().toString() },
    });
    console.log('  OK: Email sent. Message ID:', info.messageId);
    console.log('  Preview URL:', nodemailer.getTestMessageUrl?.(info) || 'n/a');
    console.log('');
    console.log('SUCCESS: nodemailer is configured correctly.');
} catch (err) {
    console.error('  FAIL: Sending failed.');
    console.error('  Error:', err.message);
    process.exit(3);
}
