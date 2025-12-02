import { Router } from 'express';
import { SystemSettingsController } from '../controllers/system-settings.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const systemSettingsController = new SystemSettingsController();

// System settings routes - all protected
router.get('/', authenticateToken, systemSettingsController.getAllSettings);
router.get('/:key', authenticateToken, systemSettingsController.getSettingByKey);
router.put('/:key', authenticateToken, systemSettingsController.updateSetting);

export default router;