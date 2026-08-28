import { Request, Response, NextFunction } from 'express';
import { initFirebase } from '../lib/firebase';


/**
 * Express middleware that verifies Firebase ID tokens.
 * Attaches `req.user` with uid, email, and role on success.
 *
 * Usage:
 *   router.get('/protected', authMiddleware, handler);
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role?: string;
  };
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_MISSING',
    });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const firebase = await initFirebase();
    if (!firebase) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
        code: 'FIREBASE_INIT_FAILED',
      });
    }

    const decoded = await firebase.auth.verifyIdToken(token);

    // Fetch role from Firestore profile
    const profileSnap = await firebase.db.collection('users').doc(decoded.uid).get();
    const role = profileSnap.exists ? profileSnap.data()?.role : 'free';

    req.user = {
      uid: decoded.uid,
      email: decoded.email || '',
      role,
    };

    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'AUTH_INVALID',
    });
  }
}

/**
 * Middleware that requires admin role. Must be used after authMiddleware.
 */
export function adminOnly(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'FORBIDDEN',
    });
  }
  next();
}
