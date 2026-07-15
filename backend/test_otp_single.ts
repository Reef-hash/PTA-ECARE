import { config } from 'dotenv';
config();
import { sendEmail } from './src/utils/email.js';
import { buildUserSignupOtpEmailHtml } from './src/controllers/auth.controller.js';

const testSingleOtp = async () => {
    try {
        console.log('?? Memulakan Ujian OTP (Satu Emel)...');
        const userHtml = buildUserSignupOtpEmailHtml('ahmadzahid482@gmail.com', '555888');
        await sendEmail('ahmadzahid482@gmail.com', 'Sahkan Pendaftaran Akaun E-CARE', userHtml);
        console.log('? Emel OTP berjaya dihantar ke ahmadzahid482@gmail.com!');
        process.exit(0);
    } catch (e) {
        console.error('? GAGAL:', e);
        process.exit(1);
    }
};

testSingleOtp();
