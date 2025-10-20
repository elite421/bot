import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authApi';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { user } = await requireAuth(req as any);
    const phone = user.phone || '';

    // Build last 7 days date keys
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const reqsRes = await query<{ createdAt: string; isVerified: boolean }>(
      `SELECT created_at AS "createdAt", is_verified AS "isVerified"
       FROM login_requests
       WHERE phone = $1 AND created_at >= $2`,
      [phone, start]
    );
    const reqs = reqsRes.rows as Array<{ createdAt: string; isVerified: boolean }>;

    const map: Record<string, { total: number; verified: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = formatDate(d);
      map[key] = { total: 0, verified: 0 };
    }
    for (const r of reqs) {
      const key = formatDate(new Date(r.createdAt as any));
      if (!map[key]) map[key] = { total: 0, verified: 0 };
      map[key].total += 1;
      if (r.isVerified) map[key].verified += 1;
    }

    const data = Object.keys(map).sort().map((k) => ({ date: k, total: map[k].total, verified: map[k].verified }));

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('dashboard/metrics error:', e);
    const msg = /Access token required|Invalid or expired session/.test(String(e?.message)) ? e.message : 'Failed to load metrics';
    const status = msg === 'Access token required' || msg === 'Invalid or expired session' ? 401 : 500;
    return NextResponse.json({ success: false, message: msg }, { status });
  }
}

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${y}-${m}-${day}`;
}
