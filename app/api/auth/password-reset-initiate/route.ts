import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function notifyBotOtp({ phone, code, type }: { phone: string; code: string; type: 'register' | 'reset' }) {
  try {
    const rawBase = process.env.BOT_SERVICE_URL || 'http://localhost:4002';
    const botBase = rawBase.replace(/\/+$/, ''); // strip trailing slashes
    const internalKey = process.env.BOT_INTERNAL_KEY || 'dev-secret-key';
    const res = await fetch(`${botBase}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': internalKey },
      body: JSON.stringify({ phone, code, type }),
    });
    const bodyText = await res.text().catch(() => '');
    return { ok: res.ok, status: res.status, bodyText };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('notifyBotOtp error:', e);
    return { ok: false, status: 0, bodyText: String((e as any)?.message || e) } as const;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { phone, email } = await req.json();
    if (!phone && !email) return NextResponse.json({ success: false, message: 'Provide phone or email' }, { status: 400 });

    let cleanPhone = '';
    if (phone) {
      cleanPhone = String(phone).replace(/\D/g, '');
    } else {
      const u = await query<{ phone: string | null }>(`SELECT phone FROM users WHERE email = $1 LIMIT 1`, [String(email)]);
      const row = u.rows[0];
      if (row?.phone) cleanPhone = String(row.phone);
    }

    if (!cleanPhone) return NextResponse.json({ success: false, message: 'No phone linked to this account' }, { status: 400 });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await query(
      `INSERT INTO otp_requests (phone, code, type, expires_at)
       VALUES ($1, $2, 'reset', $3)`,
      [cleanPhone, code, expiresAt]
    );

    const dispatch = await notifyBotOtp({ phone: cleanPhone, code, type: 'reset' });
    if (!dispatch.ok) {
      // Surface a clear error so the UI shows it instead of a generic success
      const hint = dispatch.status === 403
        ? ' (bot auth failed — check BOT_INTERNAL_KEY on Vercel and Railway)'
        : dispatch.status === 503
          ? ' (bot not ready)'
          : '';
      return NextResponse.json(
        { success: false, message: `Failed to send OTP on WhatsApp${hint}` },
        { status: 502 }
      );
    }
    return NextResponse.json({ success: true, message: 'OTP sent to WhatsApp', data: { dispatched: true } });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('password-reset-initiate error:', e);
    return NextResponse.json({ success: false, message: 'Failed to initiate password reset' }, { status: 500 });
  }
}
