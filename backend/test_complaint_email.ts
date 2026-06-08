import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { createNotification, buildNotificationEmailHtml } from './src/controllers/notifications.controller.js';

async function test() {
    console.log('--- Ujian Notifikasi E-mel Aduan Baharu ---');
    console.log('Mensimulasikan penciptaan aduan bagi pengguna:');
    console.log('- Nama: AHMAD ZAHID BIN MOHD SOFI');
    console.log('- IC: 020116110323');
    console.log('- E-mel: ahmadzahid482@gmail.com');
    
    const userId = '5ed07c8a-1d30-48a8-8b58-f7223dddd5cb';
    const reportNumber = 'R260609-001';
    const mockComplaintId = 9999;
    
    // Generate the message that will be sent
    const rawMessage = "Aduan anda R260609-001 berjaya dibuat. Sila tekan link di bawah untuk lihat progress aduan dan status semasa.";
    const emailHtml = buildNotificationEmailHtml('AHMAD ZAHID BIN MOHD SOFI', 'Aduan Berjaya Didaftarkan', rawMessage, mockComplaintId, 'user');
    
    console.log('\n--- PREVIEW PENJANAAN E-MEL ---');
    console.log('Tajuk E-mel:', 'Aduan Berjaya Didaftarkan');
    console.log('Pautan (Link) Dinamik Dijana:');
    const linkMatch = emailHtml.match(/href="([^"]+)"/);
    if (linkMatch) {
        console.log('URL Pautan:', linkMatch[1]);
    } else {
        console.log('URL Pautan tidak ditemui');
    }
    
    console.log('\nButang Mesej dalam HTML:');
    const buttonMatch = emailHtml.match(/<a[^>]+>([\s\S]*?)<\/a>/);
    if (buttonMatch) {
        console.log('Teks Butang:', buttonMatch[1].trim());
    }
    
    console.log('\nHTML E-mel Penuh (Tema Biru & Putih):');
    console.log('====================================');
    console.log(emailHtml);
    console.log('====================================');
    
    const payload = JSON.stringify({
        key: 'user_complaint_created_msg',
        params: {
            report_number: reportNumber
        }
    });
    
    console.log('\nMemulakan createNotification untuk cubaan hantaran sebenar via SMTP...');
    await createNotification(
        userId,
        'user',
        'Aduan Berjaya Didaftarkan',
        payload,
        'status_update',
        mockComplaintId
    );
    console.log('\nUjian selesai!');
}

test().catch(console.error);
