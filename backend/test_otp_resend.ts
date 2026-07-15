import { config } from 'dotenv';
config();
import { sendEmail } from './src/utils/email.js';
import { buildUserSignupOtpEmailHtml, buildActivationEmail } from './src/controllers/auth.controller.js';

const testOtpEmails = async () => {
    try {
        console.log('?? Memulakan Ujian OTP Resend Email...');

        console.log('1. Menguji OTP Pendaftaran USER (ahmadzahid482@gmail.com)...');
        const userHtml = buildUserSignupOtpEmailHtml('ahmadzahid482@gmail.com', '123456');
        await sendEmail('ahmadzahid482@gmail.com', 'Sahkan Pendaftaran Akaun E-CARE (TEST)', userHtml);
        console.log('? Emel OTP USER berjaya dihantar!');

        console.log('2. Menguji OTP Aktifkan Akaun ADMIN (adminecare.ptasssb@gmail.com)...');
        const adminHtml = buildActivationEmail('Admin E-Care', '654321', 'admin');
        await sendEmail('adminecare.ptasssb@gmail.com', 'Aktifkan Akaun Admin e-Care Anda (TEST)', adminHtml);
        console.log('? Emel OTP ADMIN berjaya dihantar!');

        console.log('3. Menguji OTP Aktifkan Akaun TECHNICIAN (ahmadtech552@gmail.com)...');
        const techHtml = buildActivationEmail('Ahmad Tech', '987654', 'technician');
        await sendEmail('ahmadtech552@gmail.com', 'Aktifkan Akaun Juruteknik e-Care Anda (TEST)', techHtml);
        console.log('? Emel OTP TECHNICIAN berjaya dihantar!');

        console.log('4. Menguji OTP Aktifkan Akaun MAIN TECHNICIAN (technicianasign@gmail.com)...');
        const mainTechHtml = buildActivationEmail('Main Tech Assign', '456789', 'technician');
        await sendEmail('technicianasign@gmail.com', 'Aktifkan Akaun Juruteknik e-Care Anda (TEST)', mainTechHtml);
        console.log('? Emel OTP MAIN TECHNICIAN berjaya dihantar!');

        console.log('?? KESEMUA UJIAN EMEL OTP BERJAYA DIHANTAR!');
        process.exit(0);
    } catch (e) {
        console.error('? GAGAL:', e);
        process.exit(1);
    }
};

testOtpEmails();
