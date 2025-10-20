import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { query } from '@/lib/db';

export type AuthedUser = {
  id: number;
  phone: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
};

export async function requireAuth(req: NextRequest): Promise<{ user: AuthedUser; token: string }>
{
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.split(' ')[1];
  if (!token) throw new Error('Access token required');

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (e) {
    // Normalize JWT verification errors to a consistent message the callers already handle as 401
    throw new Error('Invalid or expired session');
  }

  // Validate token session (legacy token-based sessions table)
  const sessionRes = await query<{ id: number }>(
    `SELECT id FROM sessions WHERE token = $1 AND expires_at > NOW() LIMIT 1`,
    [token]
  );
  const session = sessionRes.rows[0];
  if (!session) throw new Error('Invalid or expired session');

  // Best-effort: extend expiry by 10 minutes
  try {
    await query(`UPDATE sessions SET expires_at = NOW() + INTERVAL '10 minutes' WHERE id = $1`, [session.id]);
  } catch {}

  const uRes = await query<AuthedUser>(
    `SELECT id, phone, name, email, role FROM users WHERE id = $1 LIMIT 1`,
    [decoded.userId]
  );
  const u = uRes.rows[0];
  if (!u) throw new Error('Invalid or expired session');

  return { user: u as AuthedUser, token };
}
