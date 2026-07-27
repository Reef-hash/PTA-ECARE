import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authStrictLimiter, authModerateLimiter } from '../middleware/rateLimit.js';
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
router.post('/register', authModerateLimiter, validate(registerSchema), register);
router.post('/login', authModerateLimiter, validate(loginSchema), login);
router.post('/google', authModerateLimiter, validate(googleAuthSchema), googleAuth);
router.post('/verify-ic', authModerateLimiter, verifyIC);
router.post('/forgot-password', authStrictLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/verify-otp', authStrictLimiter, validate(verifyOtpSchema), verifyOtp);
router.post('/reset-password', authStrictLimiter, validate(resetPasswordSchema), resetPassword);

// OTP Verification & Account Activation routes
router.post('/verify-signup-otp', authStrictLimiter, validate(verifySignupOtpSchema), verifySignupOtp);
router.post('/resend-signup-otp', authStrictLimiter, resendSignupOtp);
router.post('/verify-activation-otp', authStrictLimiter, validate(verifyActivationOtpSchema), verifyActivationOtp);
router.post('/resend-activation-otp', authStrictLimiter, validate(resendActivationOtpSchema), resendActivationOtp);

// Protected routes
router.get('/profile', authenticateToken, getProfile);

export default router;
