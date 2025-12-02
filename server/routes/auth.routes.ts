import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken, authenticateTokenPartial } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// Auth routes - no authentication required
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// OTP verification routes - partial authentication required (allows unverified tokens)
router.post('/verify-otp', authenticateTokenPartial, authController.verifyOtp);
router.post('/resend-otp', authenticateTokenPartial, authController.resendOtp);

// Protected routes - full authentication required (OTP verified)
router.post('/request-change-password', authenticateToken, authController.requestChangePassword);
router.post('/change-password', authenticateToken, authController.changePassword);
router.post('/logout', authenticateToken, authController.logout);
router.get('/me', authenticateToken, authController.me);

export default router;