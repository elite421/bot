import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!token) return NextResponse.json({ success: false, message: 'Missing token' }, { status: 400 });

    const exists = await query<{ token: string }>(`SELECT token FROM webhook_tokens WHERE token = $1 LIMIT 1`, [token])
      .then((r) => !!r.rows[0]);

    if (!exists) return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 403 });

    // Accept any JSON payload and return success for now
    const payload = await req.json().catch(() => ({}));
    // eslint-disable-next-line no-console
    console.log('[Webhook] incoming:', { token: token.slice(0, 6) + '...', payload });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('webhook incoming error:', e);
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 });
  }
}
