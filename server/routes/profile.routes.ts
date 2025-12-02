import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const profileController = new ProfileController();

// Profile routes - all protected
router.get('/:adminId', authenticateToken, profileController.getProfile);
router.put('/:adminId', authenticateToken, profileController.updateProfile);



export default router;