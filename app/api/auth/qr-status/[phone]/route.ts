import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ phone: string }> }) {
  try {
    const { phone } = await params;
    if (!phone) return NextResponse.json({ success: false, message: 'Phone number is required' }, { status: 400 });
    const cleanPhone = String(phone).replace(/\D/g, '');

    const { rows } = await query<{ expires_at: string }>(
      `SELECT expires_at FROM login_requests
       WHERE phone = $1 AND is_verified = false AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [cleanPhone]
    );
    const lr = rows[0];
    const data = lr
      ? ({ status: 'active', timeLeft: Math.max(0, new Date(lr.expires_at).getTime() - Date.now()), expiresAt: lr.expires_at } as const)
      : ({ status: 'expired' } as const);

    if ((data as any).status === 'expired') {
      return NextResponse.json({ success: true, data: { status: 'expired', message: 'No active QR code found' } });
    }
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('qr-status error:', e);
    return NextResponse.json({ success: false, message: 'Failed to check QR status' }, { status: 500 });
  }
}
