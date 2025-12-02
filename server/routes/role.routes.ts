import { Router } from 'express';
import { RoleController } from '../controllers/role.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const roleController = new RoleController();

// Role routes - all protected
router.get('/', authenticateToken, roleController.getAllRoles);
router.get('/:id', authenticateToken, roleController.getRoleById);
router.post('/', authenticateToken, roleController.createRole);
router.put('/:id', authenticateToken, roleController.updateRole);
router.delete('/:id', authenticateToken, roleController.deleteRole);

export default router;