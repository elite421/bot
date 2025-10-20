import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authApi';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { user } = await requireAuth(req as any);
    const userId = user.id;
    const phone = user.phone || '';

    const [activeSessionsRes, pendingRequestsRes, ticketsRes, lastRes] = await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM sessions WHERE user_id = $1 AND expires_at > NOW()`, [userId]),
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM login_requests WHERE phone = $1 AND is_verified = false AND expires_at > NOW()`, [phone]),
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM support_tickets WHERE user_id = $1`, [userId]),
      query<{ createdAt: string }>(`SELECT created_at AS "createdAt" FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, [userId])
    ]);
    const activeSessions = Number(activeSessionsRes.rows[0]?.count || '0');
    const pendingRequests = Number(pendingRequestsRes.rows[0]?.count || '0');
    const tickets = Number(ticketsRes.rows[0]?.count || '0');
    const last = lastRes.rows[0] || null;

    const lastLogin = last?.createdAt ? formatDateTime(new Date(last.createdAt)) : '';

    return NextResponse.json({ success: true, data: {
      myActiveSessions: activeSessions,
      myPendingRequests: pendingRequests,
      myTickets: tickets,
      lastLogin,
    } });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('dashboard/summary error:', e);
    const msg = /Access token required|Invalid or expired session/.test(String(e?.message)) ? e.message : 'Failed to load summary';
    const status = msg === 'Access token required' || msg === 'Invalid or expired session' ? 401 : 500;
    return NextResponse.json({ success: false, message: msg }, { status });
  }
}

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function formatDateTime(d: Date) {
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}-${m}-${day} ${hh}:${mm}`;
}
