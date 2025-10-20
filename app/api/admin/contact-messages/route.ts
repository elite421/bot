import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authHelpers';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(1000, Math.max(1, Number(searchParams.get('limit') || 200)));

    // Ensure table exists (idempotent)
    try {
      await query(`CREATE TABLE IF NOT EXISTS contact_messages (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
      await query(`CREATE INDEX IF NOT EXISTS idx_contact_messages_phone ON contact_messages(phone)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at)`);
    } catch {}

    let rows: Array<{ id: number; email: string; phone: string; message: string; created_at: string }>
      = [];
    try {
      const res = await query<{
        id: number;
        email: string;
        phone: string;
        message: string;
        created_at: string;
      }>(
        `SELECT id, email, phone, message, created_at
         FROM contact_messages
         ORDER BY created_at DESC
         LIMIT ${limit}`
      );
      rows = res.rows as any[];
    } catch (e: any) {
      if (!/relation\s+"?contact_messages"?\s+does not exist/i.test(String(e?.message))) {
        throw e;
      }
      rows = [];
    }

    const data = rows.map((r) => ({
      id: r.id,
      email: r.email,
      phone: r.phone,
      message: r.message,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('Admin contact-messages error:', e);
    if (e instanceof Response) return e;
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const;
    return NextResponse.json({ success: false, message: e?.message || 'Failed to load contact messages' }, { status: 500, headers: noStoreHeaders });
  }
}
