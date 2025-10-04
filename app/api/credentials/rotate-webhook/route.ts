import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authApi';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const token = cryptoRandom(24);
    await query(
      `INSERT INTO webhook_tokens (user_id, token, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token, created_at = NOW()`,
      [user.id, token]
    );

    const base = process.env.PUBLIC_API_BASE || `http://localhost:${process.env.PORT || 3000}`;
    const webhookUrl = `${base}/api/webhook/incoming/${token}`;
    return NextResponse.json({ success: true, data: { webhookUrl } });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('credentials/rotate-webhook error:', e);
    const msg = /Access token required|Invalid or expired session/.test(String(e?.message)) ? e.message : 'Failed to rotate webhook';
    const status = msg === 'Access token required' || msg === 'Invalid or expired session' ? 401 : 500;
    return NextResponse.json({ success: false, message: msg }, { status });
  }
}

function cryptoRandom(bytes: number) {
  const b = require('crypto').randomBytes(bytes);
  return b.toString('hex');
}
