require('dotenv').config();
const { sendEmail } = require('./dist/utils/email.js');
const { buildNotificationEmailHtml } = require('./dist/controllers/notifications.controller.js');

async function run() {
    try {
        const reportNumber = 'PTAS00001';
        const techName = 'Ahmad (Test)';
        const subcategoryName = 'Mesin Basuh';
        const subject = 'Aduan Bawa Pulang (Incomplete): ' + reportNumber;
        
        const adminHtml = buildNotificationEmailHtml('Administrator', subject, `Juruteknik telah update status progress repair kerosakan untuk aduan ${reportNumber}. Sila tekan semak aduan untuk lihat lebih lanjut.`, 1, 'admin');
        const mainTechHtml = buildNotificationEmailHtml('Main Technician', subject, `Terdapat satu aduan incomplete dihantar oleh juruteknik (${techName}) untuk aduan ${reportNumber}. Sila tekan semak aduan untuk lihat lebih lanjut.`, 1, 'admin');
        const custHtml = buildNotificationEmailHtml('Pelanggan Test', subject, `${reportNumber} aduan anda telah update status progress repair kerosakan ${subcategoryName} oleh juruteknik kami (${techName}). Sila tekan semak aduan untuk lihat lebih lanjut.`, 1, 'user');
        
        await sendEmail('technicianasign@gmail.com', subject, mainTechHtml);
        console.log('Successfully sent to Main Tech (technicianasign@gmail.com)');
        
        await sendEmail('adminecare.ptasssb@gmail.com', subject, adminHtml);
        console.log('Successfully sent to Admin (adminecare.ptasssb@gmail.com)');
        
        // I won't send to a real customer email to avoid spamming strangers, but I will log it
        console.log('Customer HTML Email length:', custHtml.length);
        
    } catch (e) {
        console.error('Error sending test emails:', e);
    }
}
run();
