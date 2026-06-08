import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
    registerSchema,
    loginSchema,
    googleAuthSchema,
    forgotPasswordSchema,
    verifyOtpSchema,
    resetPasswordSchema,
    verifySignupOtpSchema,
    verifyActivationOtpSchema,
    resendActivationOtpSchema
} from '../utils/schemas.js';
import {
    register,
    login,
    googleAuth,
    forgotPassword,
    verifyOtp,
    resetPassword,
    getProfile,
    verifyIC,
    verifySignupOtp,
    resendSignupOtp,
    verifyActivationOtp,
    resendActivationOtp
} from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/google', validate(googleAuthSchema), googleAuth);
router.post('/verify-ic', verifyIC);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

// OTP Verification & Account Activation routes
router.post('/verify-signup-otp', validate(verifySignupOtpSchema), verifySignupOtp);
router.post('/resend-signup-otp', resendSignupOtp);
router.post('/verify-activation-otp', validate(verifyActivationOtpSchema), verifyActivationOtp);
router.post('/resend-activation-otp', validate(resendActivationOtpSchema), resendActivationOtp);

// Protected routes
router.get('/profile', authenticateToken, getProfile);

export default router;
