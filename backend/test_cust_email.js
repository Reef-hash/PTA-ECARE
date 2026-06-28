require('dotenv').config();
const { sendEmail } = require('./dist/utils/email.js');
const { buildNotificationEmailHtml } = require('./dist/controllers/notifications.controller.js');

async function run() {
    try {
        const reportNumber = 'PTAS00001';
        const techName = 'Ahmad (Test)';
        const subcategoryName = 'Mesin Basuh';
        const subject = 'Aduan Bawa Pulang (Incomplete): ' + reportNumber;
        
        const custHtml = buildNotificationEmailHtml('Pelanggan Test', subject, `${reportNumber} aduan anda telah update status progress repair kerosakan ${subcategoryName} oleh juruteknik kami (${techName}). Sila tekan semak aduan untuk lihat lebih lanjut.`, 1, 'user');
        
        // Send to technicianasign@gmail.com so the user can see what the customer sees
        await sendEmail('technicianasign@gmail.com', '[TEST CUSTOMER EMAIL] ' + subject, custHtml);
        console.log('Successfully sent customer test to technicianasign@gmail.com');
        
    } catch (e) {
        console.error('Error sending test emails:', e);
    }
}
run();
