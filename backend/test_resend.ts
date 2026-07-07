import { config } from 'dotenv';
config();
import { sendEmail } from './src/utils/email.js';
import { buildNotificationEmailHtml } from './src/controllers/notifications.controller.js';

const testEmails = async () => {
    try {
        console.log('?? Memulakan Ujian Resend Email...');

        console.log('1. Menguji Emel USER (ahmadzahid482@gmail.com)...');
        const userHtml = buildNotificationEmailHtml('Ahmad Zahid (User)', 'Status Terkini Aduan', 'Aduan anda telah siap dibaiki.', 'R123', 'user');
        await sendEmail('ahmadzahid482@gmail.com', 'Ujian Notifikasi User E-Care', userHtml);
        console.log('? Emel USER berjaya dihantar!');

        console.log('2. Menguji Emel ADMIN (adminecare.ptasssb@gmail.com)...');
        const adminHtml = buildNotificationEmailHtml('Admin E-Care', 'Aduan Baru', 'Terdapat aduan kerosakan baru yang memerlukan semakan anda.', 'R124', 'admin');
        await sendEmail('adminecare.ptasssb@gmail.com', 'Ujian Notifikasi Admin E-Care', adminHtml);
        console.log('? Emel ADMIN berjaya dihantar!');

        console.log('3. Menguji Emel TECHNICIAN (ahmadtech552@gmail.com)...');
        const techHtml = buildNotificationEmailHtml('Ahmad Tech', 'Tugasan Baru (Assignment)', 'Anda telah ditugaskan untuk membaiki kerosakan baru.', 'R125', 'technician');
        await sendEmail('ahmadtech552@gmail.com', 'Ujian Notifikasi Technician E-Care', techHtml);
        console.log('? Emel TECHNICIAN berjaya dihantar!');

        console.log('4. Menguji Emel MAIN TECHNICIAN (technicianasign@gmail.com)...');
        const mainTechHtml = buildNotificationEmailHtml('Main Tech Assign', 'Pengesahan Semakan', 'Tugasan memerlukan pengesahan dan penyemakan kualiti.', 'R126', 'technician');
        await sendEmail('technicianasign@gmail.com', 'Ujian Notifikasi Main Tech E-Care', mainTechHtml);
        console.log('? Emel MAIN TECHNICIAN berjaya dihantar!');

        console.log('?? KESEMUA UJIAN EMEL BERJAYA DIHANTAR!');
        process.exit(0);
    } catch (e) {
        console.error('? GAGAL:', e);
        process.exit(1);
    }
};

testEmails();
