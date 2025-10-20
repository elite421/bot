import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authApi';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const { type } = await req.json();
    if (!['live', 'test'].includes(String(type))) {
      return NextResponse.json({ success: false, message: 'type must be "live" or "test"' }, { status: 400 });
    }
    const key = `${type === 'live' ? 'rvotp_live' : 'rvotp_test'}_${cryptoRandom(24)}`;
    await query(
      `INSERT INTO api_keys (user_id, api_key, type, active, created_at)
       VALUES ($1, $2, $3, true, NOW())
       ON CONFLICT (user_id, type)
       DO UPDATE SET api_key = EXCLUDED.api_key, active = true, created_at = NOW()`,
      [user.id, key, String(type)]
    );
    return NextResponse.json({ success: true, data: { type, apiKey: key } });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('credentials/regenerate-key error:', e);
    const msg = /Access token required|Invalid or expired session/.test(String(e?.message)) ? e.message : 'Failed to regenerate key';
    const status = msg === 'Access token required' || msg === 'Invalid or expired session' ? 401 : 500;
    return NextResponse.json({ success: false, message: msg }, { status });
  }
}

function cryptoRandom(bytes: number) {
  const b = require('crypto').randomBytes(bytes);
  return b.toString('hex');
}
