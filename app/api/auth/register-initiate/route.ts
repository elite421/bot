import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function notifyBotOtp({ phone, code, type }: { phone: string; code: string; type: 'register' | 'reset' }) {
  try {
    const botUrl = process.env.BOT_SERVICE_URL || 'http://localhost:4002';
    const internalKey = process.env.BOT_INTERNAL_KEY || 'dev-secret-key';
    const res = await fetch(`${botUrl}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': internalKey },
      body: JSON.stringify({ phone, code, type }),
    });
    return res.ok;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('notifyBotOtp error:', e);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password } = await req.json();
    if (!name || !email || !phone || !password) {
      return NextResponse.json({ success: false, message: 'Name, email, phone, and password are required' }, { status: 400 });
    }

    const cleanPhone = (() => {
      const rawDigits = String(phone).replace(/\D/g, '');
      const DEFAULT_COUNTRY_CODE = String(process.env.DEFAULT_COUNTRY_CODE || '91');
      let digits = rawDigits.replace(/^0+/, '');
      if (!digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length <= 10) {
        digits = `${DEFAULT_COUNTRY_CODE}${digits}`;
      }
      return digits;
    })();

    const existing = await query<{ id: number }>(
      `SELECT id FROM users WHERE phone = $1 OR email = $2 LIMIT 1`,
      [cleanPhone, String(email)]
    );
    const exists = !!existing.rows[0];

    if (exists) return NextResponse.json({ success: false, message: 'User already exists' }, { status: 400 });

    // generate 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await query(
      `INSERT INTO otp_requests (phone, code, type, expires_at)
       VALUES ($1, $2, 'register', $3)`,
      [cleanPhone, code, expiresAt]
    );

    const dispatched = await notifyBotOtp({ phone: cleanPhone, code, type: 'register' });
    return NextResponse.json({ success: true, message: dispatched ? 'OTP sent to WhatsApp' : 'OTP generated (delivery pending)', data: { dispatched } });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('register-initiate error:', e);
    return NextResponse.json({ success: false, message: 'Failed to initiate registration' }, { status: 500 });
  }
}
