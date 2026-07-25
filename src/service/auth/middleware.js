'use strict';

const { verifyToken } = require('./jwtAuth');

/**
 * Express middleware requiring a valid Bearer JWT.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Token is invalid or expired' });
  }

  req.user = payload;
  next();
}

/**
 * Express middleware requiring an admin JWT (PIN verified).
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    return res.status(403).json({
      error: 'REQUIRES_ADMIN',
      message: 'This operation requires admin PIN verification',
    });
  });
}

module.exports = { requireAuth, requireAdmin };
