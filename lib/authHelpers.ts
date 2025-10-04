import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from './auth';
import type { NextRequest } from 'next/server';
import { query } from './db';

export async function getSessionAndUser() {
  const session = (await getServerSession(authOptions as any)) as Session | null;
  if (!session || !session.user) return { session: null, user: null } as const;
  const id = Number((session.user as any).id || 0);
  if (!id) return { session: null, user: null } as const;
  const { rows } = await query(
    'SELECT id, phone, name, email, role, is_blocked, created_at, updated_at FROM users WHERE id = $1 LIMIT 1',
    [id]
  );
  const user = rows[0] || null;
  return { session, user } as const;
}

export async function requireUser() {
  const { session, user } = await getSessionAndUser();
  if (!session || !user) {
    const noStore = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
      'Content-Type': 'application/json',
    } as const;
    throw new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401, headers: noStore });
  }
  return { session, user } as const;
}

export async function requireAdmin() {
  const session = (await getServerSession(authOptions as any)) as Session | null;
  if (!session || !session.user) {
    const noStore = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
      'Content-Type': 'application/json',
    } as const;
    throw new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401, headers: noStore });
  }
  const role = ((session.user as any).role || 'user');
  if (role !== 'admin') {
    const noStore = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
      'Content-Type': 'application/json',
    } as const;
    throw new Response(JSON.stringify({ success: false, message: 'Forbidden' }), { status: 403, headers: noStore });
  }
  return { session } as const;
}

export function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const ip = req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || null;
  return ip;
}

export function getUserAgent(req: NextRequest): string | null {
  return req.headers.get('user-agent');
}
