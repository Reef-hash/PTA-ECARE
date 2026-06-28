require('dotenv').config();
const { sendEmail } = require('./dist/utils/email.js');
const { buildNotificationEmailHtml } = require('./dist/controllers/notifications.controller.js');

async function run() {
    try {
        const reportNumber = 'PTAS-TEST-001';
        const techName = 'Ahmad (Test)';
        const subcategoryName = 'Mesin Basuh';
        const subject = '[TEST] Aduan Bawa Pulang (Incomplete): ' + reportNumber;
        
        const adminHtml = buildNotificationEmailHtml('Administrator', subject, `Ini adalah ujian notification ke email admin.<br><br>Juruteknik telah update status progress repair kerosakan untuk aduan ${reportNumber}. Sila tekan semak aduan untuk lihat lebih lanjut.`, 1, 'admin');
        
        await sendEmail('adminecare.ptasssb@gmail.com', subject, adminHtml);
        console.log('Successfully sent to Admin (adminecare.ptasssb@gmail.com)');
    } catch (e) {
        console.error('Error sending test emails:', e);
    }
}
run();
