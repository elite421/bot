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
      await query(`CREATE TABLE IF NOT EXISTS otp_requests (
        id SERIAL PRIMARY KEY,
        phone TEXT NOT NULL,
        code TEXT NOT NULL,
        type TEXT NOT NULL,
        consumed BOOLEAN DEFAULT FALSE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        verified_at TIMESTAMPTZ NULL
      )`);
      await query(`CREATE INDEX IF NOT EXISTS idx_otp_requests_phone ON otp_requests(phone)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_otp_requests_expires_at ON otp_requests(expires_at)`);
    } catch {}

    let rows: Array<{
      id: number;
      phone: string;
      type: string;
      consumed: boolean;
      expires_at: string;
      created_at: string;
      verified_at: string | null;
    }> = [];
    try {
      const res = await query<{
        id: number;
        phone: string;
        type: string;
        consumed: boolean;
        expires_at: string;
        created_at: string;
        verified_at: string | null;
      }>(
        `SELECT id, phone, type, consumed, expires_at, created_at, verified_at
         FROM otp_requests
         ORDER BY created_at DESC
         LIMIT ${limit}`
      );
      rows = res.rows as any[];
    } catch (e: any) {
      if (!/relation\s+"?otp_requests"?\s+does not exist/i.test(String(e?.message))) {
        throw e;
      }
      rows = [];
    }

    const data = rows.map((r) => ({
      id: r.id,
      phone: r.phone,
      type: (r as any).type,
      consumed: (r as any).consumed,
      expiresAt: (r as any).expires_at,
      createdAt: (r as any).created_at,
      verifiedAt: (r as any).verified_at,
      // Do not return code in API output to avoid leaking OTPs in admin UI
    }));

    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('Admin otp-requests error:', e);
    if (e instanceof Response) return e;
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const;
    return NextResponse.json({ success: false, message: e?.message || 'Failed to load OTP requests' }, { status: 500, headers: noStoreHeaders });
  }
}
