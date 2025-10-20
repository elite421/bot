import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_SECRET_FALLBACK = process.env.JWT_SECRET_FALLBACK || '';
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || '';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export type JwtPayload = {
  userId: number;
  phone?: string | null;
  email?: string | null;
};

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  const secrets = [JWT_SECRET, JWT_SECRET_FALLBACK, NEXTAUTH_SECRET].filter(Boolean);
  let lastErr: unknown = null;
  for (const s of secrets) {
    try {
      const decoded = jwt.verify(token, s);
      return decoded as JwtPayload;
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  // Re-throw last error for callers to handle
  throw lastErr instanceof Error ? lastErr : new Error('Invalid or expired session');
}
