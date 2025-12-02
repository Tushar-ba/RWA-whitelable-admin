import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { ProfileService } from '../services/profile.service';

const router = Router();
const profileService = new ProfileService();

// Update wallet address
router.put('/update-address', authenticateToken, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const adminId = req.adminId;

    if (!adminId) {
      res.status(400).json({ message: 'Admin ID is required' });
      return;
    }

    // Validate wallet address format (basic validation)
    if (walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      res.status(400).json({ message: 'Invalid wallet address format' });
      return;
    }

    const updatedProfile = await profileService.updateAdminProfile(adminId, {
      walletAddress: walletAddress || ''
    });

    if (!updatedProfile) {
      res.status(404).json({ message: 'Admin profile not found' });
      return;
    }

    res.json({
      message: 'Wallet address updated successfully',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Update wallet address error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;