import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authApi';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { user } = await requireAuth(req as any);
    const phone = user.phone || '';
    const res = await query<{ id: number; phone: string; hashCode: string; isVerified: boolean; createdAt: string }>(
      `SELECT id, phone, hash_code AS "hashCode", is_verified AS "isVerified", created_at AS "createdAt"
       FROM login_requests
       WHERE phone = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [phone]
    );
    const data = res.rows.map((r) => ({
      id: r.id,
      mobileNo: r.phone,
      hash: r.hashCode,
      status: r.isVerified ? 'Verified' : 'Pending',
      date: formatDateTime(new Date(r.createdAt as any)),
    }));
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('dashboard/auth-report error:', e);
    const msg = /Access token required|Invalid or expired session/.test(String(e?.message)) ? e.message : 'Failed to load auth report';
    const status = msg === 'Access token required' || msg === 'Invalid or expired session' ? 401 : 500;
    return NextResponse.json({ success: false, message: msg }, { status });
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
}
