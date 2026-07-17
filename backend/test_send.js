import { sendEmail } from './dist/utils/email.js';
import { buildUserSignupOtpEmailHtml } from './dist/controllers/auth.controller.js';

async function run() {
    const html = buildUserSignupOtpEmailHtml('ahmadzahid482@gmail.com', '123456');
    await sendEmail('ahmadzahid482@gmail.com', 'Test Email', html);
    console.log("Email sent!");
}
run();
