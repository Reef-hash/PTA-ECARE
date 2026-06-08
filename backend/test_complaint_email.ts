import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { createNotification } from './src/controllers/notifications.controller.js';

async function test() {
    console.log('--- Ujian Notifikasi E-mel Aduan Baharu (3 Senario Pelanggan) ---');
    
    // User details: AHMAD ZAHID BIN MOHD SOFI
    const userId = '5ed07c8a-1d30-48a8-8b58-f7223dddd5cb';
    const reportNumber = 'A00052'; // Actual report number
    const mockComplaintId = 67; // Database reference ID for A00052
    
    // Senario 1: Aduan berjaya dibuat
    console.log('\n--- Ujian Senario 1: Aduan Berjaya Didaftarkan ---');
    const payload1 = JSON.stringify({
        key: 'user_complaint_created_msg',
        params: {
            report_number: reportNumber
        }
    });
    await createNotification(
        userId,
        'user',
        'Aduan Berjaya Didaftarkan',
        payload1,
        'status_update',
        mockComplaintId
    );

    // Senario 2: Aduan sedang diproses oleh Juruteknik
    console.log('\n--- Ujian Senario 2: Aduan Sedang Diproses ---');
    const payload2 = `Status Update: Complaint ${reportNumber} is being processed by technician Ahmad Zahid at 09/06/2026 01:12.`;
    await createNotification(
        userId,
        'user',
        `Status Update: ${reportNumber}`,
        payload2,
        'status_update_detailed',
        mockComplaintId
    );

    // Senario 3: Aduan telah siap dibaiki oleh Juruteknik
    console.log('\n--- Ujian Senario 3: Aduan Telah Siap Dibaiki ---');
    const payload3 = `Status Update: Complaint ${reportNumber} is now completed by technician Ahmad Zahid at 09/06/2026 01:12. Ready for pickup.`;
    await createNotification(
        userId,
        'user',
        `Status Update: ${reportNumber}`,
        payload3,
        'status_update_detailed',
        mockComplaintId
    );

    console.log('\nSemua ujian simulasi selesai!');
}

test().catch(console.error);
