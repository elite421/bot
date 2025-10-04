import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authApi';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function formatDateTime(d: Date) {
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const res = await query<{ id: number; subject: string; message: string; status: string; createdAt: string }>(
      `SELECT id, subject, message, status, created_at AS "createdAt"
       FROM support_tickets
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [user.id]
    );
    const data = res.rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      message: r.message,
      status: r.status,
      created_at: formatDateTime(new Date(r.createdAt as any)),
    }));
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('tickets GET error:', e);
    const msg = /Access token required|Invalid or expired session/.test(String(e?.message)) ? e.message : 'Failed to load tickets';
    const status = msg === 'Access token required' || msg === 'Invalid or expired session' ? 401 : 500;
    return NextResponse.json({ success: false, message: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const { subject, message } = await req.json();
    if (!subject || !message) {
      return NextResponse.json({ success: false, message: 'Subject and message are required' }, { status: 400 });
    }
    const ins = await query<{ id: number; subject: string; message: string; status: string; createdAt: string }>(
      `INSERT INTO support_tickets (user_id, subject, message)
       VALUES ($1, $2, $3)
       RETURNING id, subject, message, status, created_at AS "createdAt"`,
      [user.id, String(subject), String(message)]
    );
    const row = ins.rows[0];
    const data = { id: row.id, subject: row.subject, message: row.message, status: row.status, created_at: formatDateTime(new Date(row.createdAt as any)) };
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('tickets POST error:', e);
    const msg = /Access token required|Invalid or expired session/.test(String(e?.message)) ? e.message : 'Failed to create ticket';
    const status = msg === 'Access token required' || msg === 'Invalid or expired session' ? 401 : 500;
    return NextResponse.json({ success: false, message: msg }, { status });
  }
}
