import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from './jwtAuth';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'INVALID_TOKEN', message: 'Token is invalid or expired' });
    return;
  }

  req.user = payload;
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    res.status(403).json({
      error: 'REQUIRES_ADMIN',
      message: 'This operation requires admin PIN verification',
    });
  });
}
