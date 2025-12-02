import { Request, Response, NextFunction } from 'express';
import { JWTUtil } from '../utils/jwt.util';

export interface AuthenticatedRequest extends Request {
  admin?: {
    adminId: string;
    email: string;
    role: string;
    permissions: string[];
    otpVerified?: boolean;
  };
}

// Full authentication - requires OTP verification
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  // Try to get token from cookie first, then from authorization header
  let token = req.cookies?.authToken;
  
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  }

  if (!token) {
    res.status(401).json({ message: 'Access token required' });
    return;
  }

  const payload = JWTUtil.verifyToken(token);
  if (!payload) {
    res.status(403).json({ message: 'Invalid or expired token' });
    return;
  }

  // Check if OTP is verified for full authentication
  if (payload.otpVerified === false) {
    res.status(401).json({ message: 'OTP verification required' });
    return;
  }

  req.admin = payload;
  next();
};

// Partial authentication - allows access for OTP verification flow
export const authenticateTokenPartial = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  // Try to get token from cookie first, then from authorization header
  let token = req.cookies?.authToken;
  
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  }

  if (!token) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const payload = JWTUtil.verifyToken(token);
  if (!payload) {
    res.status(403).json({ message: 'Invalid or expired token' });
    return;
  }

  // Allow both verified and unverified tokens
  req.admin = payload;
  next();
};

export const requirePermissions = (requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const hasPermission = requiredPermissions.some(permission => 
      req.admin!.permissions.includes(permission)
    );

    if (!hasPermission) {
      res.status(403).json({ 
        message: 'Insufficient permissions',
        required: requiredPermissions,
        current: req.admin.permissions
      });
      return;
    }

    next();
  };
};