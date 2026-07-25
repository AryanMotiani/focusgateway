import jwt from 'jsonwebtoken';
import { getAppConfig } from '../../config';

export interface TokenPayload {
  role: 'admin' | 'standard';
  iat?: number;
  exp?: number;
}

function getSecret(): string {
  return getAppConfig().jwtSecret;
}

export function issueToken(role: 'admin' | 'standard' = 'standard', expiresIn: string = '15m'): string {
  const secret = getSecret();
  return jwt.sign({ role }, secret, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const secret = getSecret();
    return jwt.verify(token, secret) as TokenPayload;
  } catch (err) {
    return null;
  }
}
