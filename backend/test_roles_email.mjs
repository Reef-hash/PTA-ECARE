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

const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
});

const targets = [
    { role: 'Admin', email: 'adminecare.ptasssb@gmail.com' },
    { role: 'Technician', email: 'comelafnan2@gmail.com' },
    { role: 'User (Pelanggan)', email: 'ahmadzahid482@gmail.com' },
    { role: 'Main Technician', email: 'technicianasign@gmail.com' }
];

console.log('--- Mula Menghantar Ujian Emel Kepada Keempat-empat Peranan ---');

async function sendTestEmails() {
    for (const target of targets) {
        console.log(`\nMenghantar ke [${target.role}]: ${target.email}...`);
        try {
            const info = await transporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to: target.email,
                subject: `[E-CARE] Ujian Notifikasi - ${target.role}`,
                html: `
<div style="font-family:Segoe UI,Arial,sans-serif;background:#f8faff;padding:40px 0;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;padding:30px;text-align:center;">
      <h1 style="margin:0;font-size:26px;letter-spacing:1px;">E-CARE</h1>
      <p style="margin:5px 0 0;font-size:13px;opacity:.9;">Ujian Simulasi E-mel 4 Penjuru</p>
    </div>
    <div style="padding:30px;line-height:1.6;color:#334155;">
      <h2 style="color:#1e293b;margin-top:0;">Helo, ${target.role}!</h2>
      <p>Ini adalah e-mel ujian daripada sistem E-CARE untuk mengesahkan bahawa e-mel notifikasi boleh sampai ke peranan anda dengan sempurna.</p>
      <p>Sekiranya anda membaca ini, bermaksud notifikasi untuk papan pemuka (dashboard) anda beroperasi dengan baik.</p>
      <p style="font-size:12px;color:#94a3b8;">Timestamp: ${new Date().toISOString()}</p>
    </div>
    <div style="background:#f1f5f9;padding:20px;text-align:center;font-size:11px;color:#64748b;">
      &copy; 2026 DFKTVETMARABESUT
    </div>
  </div>
</div>`,
                headers: { 'X-Entity-Ref-ID': Date.now().toString() },
            });
            console.log(`  BERJAYA: E-mel telah selamat dihantar (ID: ${info.messageId})`);
        } catch (err) {
            console.error(`  GAGAL: Gagal menghantar e-mel ke ${target.email}`);
            console.error('  Ralat:', err.message);
        }
    }
    console.log('\n--- Ujian Selesai ---');
}

sendTestEmails();
