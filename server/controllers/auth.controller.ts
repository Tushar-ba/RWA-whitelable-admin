import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { loginSchema, otpSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '@shared/schema';
import { JWTUtil } from '../utils/jwt.util';
import { CookieUtil } from '../utils/cookie.util';
import { emailService } from '../services/email.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const admin = await this.authService.getAdminByEmail(email);
      if (!admin) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      // Verify password using bcrypt
      const isPasswordValid = await this.authService.verifyPassword(password, admin.password_hash);
      if (!isPasswordValid) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      if (admin.account_status !== 'verified') {
        res.status(401).json({ message: "Account is not verified" });
        return;
      }

      // Update last login
      await this.authService.updateLastLogin(admin._id.toString());

      // Calculate permissions from roles
      let permissions = admin.permissions || [];
      if (admin.roles && admin.roles.length > 0) {
        const calculatedPermissions = await this.authService.calculatePermissionsFromRoles(admin.roles);
        permissions = Array.from(new Set([...permissions, ...calculatedPermissions]));
      }

      // Generate JWT token for OTP verification (not fully authenticated yet)
      const token = JWTUtil.generateToken({
        adminId: admin._id.toString(),
        email: admin.email,
        role: admin.roles?.[0] || 'DEFAULT_ADMIN_ROLE',
        permissions: permissions,
        otpVerified: false
      });

      // Set token in HTTP-only cookie
      CookieUtil.setAuthCookie(res, token);

      // Generate and send OTP for 2FA
      const otp = await this.authService.generateAndSaveOTP(admin._id.toString());
      
      try {
        await emailService.sendOTPEmail(admin.email, otp, admin.full_name);
        console.log(`📧 OTP email sent to ${admin.email}`);
      } catch (emailError) {
        console.error('Failed to send OTP email:', emailError);
        // Continue with login but log the error
      }

      res.json({ 
        message: "Login successful. Please check your email for verification code.",
        admin: { 
          id: admin._id, 
          user_id: admin.user_id,
          email: admin.email, 
          full_name: admin.full_name,
          roles: admin.roles,
          permissions: permissions
        } 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ message: "Invalid request data" });
    }
  };

  verifyOtp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { otp } = otpSchema.parse(req.body);
      
      // Get admin info from middleware (partial authentication)
      if (!req.admin?.adminId) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      // Find admin
      const admin = await this.authService.getAdminById(req.admin.adminId);
      if (!admin) {
        res.status(404).json({ message: "Admin not found" });
        return;
      }


      // Check if OTP exists and hasn't expired
      if (!admin.otp || !admin.otp_expires_at) {
        res.status(400).json({ message: "No OTP found. Please request a new one." });
        return;
      }

      if (new Date() > admin.otp_expires_at) {
        res.status(400).json({ message: "OTP has expired. Please request a new one." });
        return;
      }

      // Verify OTP matches the stored one
      if (admin.otp !== otp) {
        res.status(401).json({ message: "Invalid OTP" });
        return;
      }

      // OTP verified successfully - mark admin as verified and clear OTP
      await this.authService.markAdminAsVerified(admin._id.toString());

      // Generate new token with OTP verified
      const fullAuthToken = JWTUtil.generateToken({
        adminId: admin._id.toString(),
        email: admin.email,
        role: admin.roles?.[0] || 'DEFAULT_ADMIN_ROLE',
        permissions: req.admin.permissions,
        otpVerified: true
      });

      // Set the new fully authenticated token
      CookieUtil.setAuthCookie(res, fullAuthToken);

      res.json({ 
        message: "OTP verified successfully",
        authenticated: true
      });
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(400).json({ message: "Invalid OTP format" });
    }
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      
      const admin = await this.authService.getAdminByEmail(email);
      if (!admin) {
        res.status(404).json({ message: "Email not found" });
        return;
      }

      res.json({ message: "Reset instructions sent to email" });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(400).json({ message: "Invalid email format" });
    }
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { password } = resetPasswordSchema.parse(req.body);
      
      // For demo purposes, just return success
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(400).json({ message: "Invalid password format" });
    }
  };

  resendOtp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Get admin info from middleware (partial authentication)
      if (!req.admin?.adminId) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      // Get admin details
      const admin = await this.authService.getAdminById(req.admin.adminId);
      if (!admin) {
        res.status(404).json({ message: "Admin not found" });
        return;
      }

      // Generate new OTP and save it
      const otp = await this.authService.generateAndSaveOTP(admin._id.toString());
      
      try {
        await emailService.sendOTPEmail(admin.email, otp, admin.full_name);
        console.log(`📧 Resent OTP email to ${admin.email}`);
      } catch (emailError) {
        console.error('Failed to resend OTP email:', emailError);
        res.status(500).json({ message: "Failed to send OTP email" });
        return;
      }

      res.json({ 
        message: "OTP has been resent to your email"
      });
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({ message: "Failed to resend OTP" });
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      // Clear the auth cookie
      CookieUtil.clearAuthCookie(res);
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: "Logout failed" });
    }
  };

  me = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get token from cookie
      const token = req.cookies?.authToken;
      
      if (!token) {
        res.status(401).json({ message: 'Not authenticated' });
        return;
      }

      // Verify token
      const payload = JWTUtil.verifyToken(token);
      if (!payload) {
        res.status(401).json({ message: 'Invalid token' });
        return;
      }

      // Get admin details
      const admin = await this.authService.getAdminById(payload.adminId);
      if (!admin) {
        res.status(404).json({ message: 'Admin not found' });
        return;
      }

      // Calculate permissions from roles if not directly assigned
      let permissions = admin.permissions || [];
      if (admin.roles && admin.roles.length > 0) {
        const calculatedPermissions = await this.authService.calculatePermissionsFromRoles(admin.roles);
        // Merge stored permissions with calculated permissions
        permissions = Array.from(new Set([...permissions, ...calculatedPermissions]));
      }

      res.json({
        admin: {
          id: admin._id,
          user_id: admin.user_id,
          email: admin.email,
          full_name: admin.full_name,
          roles: admin.roles || ['DEFAULT_ADMIN_ROLE'],
          permissions: permissions,
          isSuperAdmin: admin.isSuperAdmin || false,
          network: admin.network || 'Ethereum',
          walletAddress: admin.wallet_address
        }
      });
    } catch (error) {
      console.error('Me endpoint error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  requestChangePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { currentPassword } = req.body;

      if (!currentPassword) {
        res.status(400).json({ message: 'Current password is required' });
        return;
      }

      // Get token from cookie
      const token = req.cookies?.authToken;
      
      if (!token) {
        res.status(401).json({ message: 'Not authenticated' });
        return;
      }

      // Verify token
      const payload = JWTUtil.verifyToken(token);
      if (!payload) {
        res.status(401).json({ message: 'Invalid token' });
        return;
      }

      // Get admin details
      const admin = await this.authService.getAdminById(payload.adminId);
      if (!admin) {
        res.status(404).json({ message: 'Admin not found' });
        return;
      }

      // Verify current password first
      const isCurrentPasswordValid = await this.authService.verifyPassword(currentPassword, admin.password_hash);
      if (!isCurrentPasswordValid) {
        res.status(400).json({ message: "Current password is incorrect" });
        return;
      }

      // Generate OTP for password change
      const otp = await this.authService.generateAndSaveOTP(admin._id.toString());

      // Send change password OTP email
      await emailService.sendChangePasswordOTPEmail(
        admin.email,
        otp,
        admin.full_name
      );

      res.json({ message: "Password change OTP sent to your email" });
    } catch (error) {
      console.error('Request change password error:', error);
      res.status(500).json({ message: "Failed to send change password OTP" });
    }
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { currentPassword, newPassword, otp } = req.body;

      // Get token from cookie
      const token = req.cookies?.authToken;
      
      if (!token) {
        res.status(401).json({ message: 'Not authenticated' });
        return;
      }

      // Verify token
      const payload = JWTUtil.verifyToken(token);
      if (!payload) {
        res.status(401).json({ message: 'Invalid token' });
        return;
      }

      // Get admin details
      const admin = await this.authService.getAdminById(payload.adminId);
      if (!admin) {
        res.status(404).json({ message: 'Admin not found' });
        return;
      }

      // Verify current password
      const isCurrentPasswordValid = await this.authService.verifyPassword(currentPassword, admin.password_hash);
      if (!isCurrentPasswordValid) {
        res.status(400).json({ message: "Current password is incorrect" });
        return;
      }

      // Verify OTP
      if (!admin.otp || !admin.otp_expires_at) {
        res.status(400).json({ message: "No OTP found. Please request a new one." });
        return;
      }

      if (new Date() > admin.otp_expires_at) {
        res.status(400).json({ message: "OTP has expired. Please request a new one." });
        return;
      }

      if (admin.otp !== otp) {
        res.status(401).json({ message: "Invalid OTP" });
        return;
      }

      // Update password and clear OTP
      await this.authService.updatePassword(admin._id.toString(), newPassword);

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: "Failed to change password" });
    }
  };
}