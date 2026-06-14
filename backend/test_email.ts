import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend folder
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { sendEmail } from './src/utils/email.js';

const testEmailRecipient = 'aiskrimgoreng77@gmail.com';
const mockOtp = '883921';
const confirmationUrl = `https://pta-ecare.vercel.app/users/register?email=${encodeURIComponent(testEmailRecipient)}&otp=${mockOtp}`;

const runTest = async () => {
    console.log('--- E-CARE SMTP OTP Email Test Script ---');
    console.log(`SMTP Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
    console.log(`SMTP Port: ${process.env.SMTP_PORT || '465'}`);
    console.log(`SMTP User: ${process.env.SMTP_USER || 'ptaecare@gmail.com'}`);
    console.log(`Sending OTP test email to: ${testEmailRecipient}...`);

    try {
        await sendEmail(
            testEmailRecipient,
            'Sahkan Pendaftaran Akaun E-CARE',
            `
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
                ${mockOtp}
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
            `
        );
        console.log('\n✅ JAYA: E-mel OTP pengesahan berjaya dihantar!');
    } catch (err: any) {
        console.error('\n❌ GAGAL: Penghantaran emel gagal.');
        console.error('Punca Ralat:', err.message);
    }
};

runTest();
