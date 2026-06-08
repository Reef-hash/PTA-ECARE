import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend folder
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { sendEmail } from './src/utils/email.js';

const testEmailRecipient = 'ptaecare@gmail.com';

const runTest = async () => {
    console.log('--- E-CARE Email Test Script ---');
    console.log(`SMTP Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
    console.log(`SMTP Port: ${process.env.SMTP_PORT || '465'}`);
    console.log(`SMTP User: ${process.env.SMTP_USER || 'ptaecare@gmail.com'}`);
    console.log(`SMTP Pass: ${process.env.SMTP_PASS === 'your_gmail_app_password_here' ? '[PLACEHOLDER PASSWORD DETECTED]' : '[CUSTOM PASSWORD DETECTED]'}`);
    console.log(`Sending test email to: ${testEmailRecipient}...`);

    try {
        await sendEmail(
            testEmailRecipient,
            'Ujian Sistem E-mel E-CARE',
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; padding: 25px 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">Ujian E-mel Berjaya!</h1>
                </div>
                <div style="padding: 30px; color: #334155; line-height: 1.6;">
                    <p>Hi,</p>
                    <p>Skrip ujian emel anda telah berjaya dijalankan dari server backend.</p>
                    <p>Sekiranya anda menerima emel ini, bermakna tetapan SMTP dan kata laluan emel anda di fail <code>backend/.env</code> adalah 100% betul!</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #94a3b8;">Hantaran automatik sistem E-CARE.</p>
                </div>
            </div>
            `
        );
        console.log('\n✅ JAYA: E-mel ujian berjaya dihantar!');
    } catch (err: any) {
        console.error('\n❌ GAGAL: Penghantaran emel gagal.');
        console.error('Punca Ralat:', err.message);
        if (process.env.SMTP_PASS === 'your_gmail_app_password_here') {
            console.log('\n💡 CADANGAN: Sila kemas kini fail "backend/.env" dengan meletakkan App Password Gmail sebenar anda di lajur SMTP_PASS.');
        }
    }
};

runTest();
