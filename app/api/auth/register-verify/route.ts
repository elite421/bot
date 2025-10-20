import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/jwt';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password, code } = await req.json();
    if (!name || !email || !phone || !password || !code) {
      return NextResponse.json({ success: false, message: 'All fields including OTP code are required' }, { status: 400 });
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
    const hashed = await bcrypt.hash(String(password), 10);

    const otpRes = await query<{ id: number }>(
      `SELECT id FROM otp_requests
       WHERE phone = $1 AND type = 'register' AND code = $2 AND consumed = false AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [cleanPhone, String(code)]
    );
    const otp = otpRes.rows[0];
    if (!otp) return NextResponse.json({ success: false, message: 'Invalid OTP' }, { status: 400 });

    const existsRes = await query<{ id: number }>(
      `SELECT id FROM users WHERE phone = $1 OR email = $2 LIMIT 1`,
      [cleanPhone, String(email)]
    );
    if (existsRes.rows[0]) return NextResponse.json({ success: false, message: 'User already exists' }, { status: 400 });

    const createdRes = await query<{ id: number; isBlocked: boolean }>(
      `INSERT INTO users (phone, email, name, password, is_verified)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, is_blocked AS "isBlocked"`,
      [cleanPhone, String(email), String(name), hashed]
    );
    const created = createdRes.rows[0];
    await query(`UPDATE otp_requests SET consumed = true, verified_at = NOW() WHERE id = $1`, [otp.id]);
    if (created.isBlocked) return NextResponse.json({ success: false, message: 'Your account is blocked. Please contact support.' }, { status: 403 });

    const token = signToken({ userId: created.id, phone: cleanPhone, email: String(email) });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO sessions (user_id, token, expires_at, auth_method)
       VALUES ($1, $2, $3, 'password')`,
      [created.id, token, expiresAt]
    );
    const userId = created.id;

    // Grant 10 welcome auth credits on first-time registration
    try {
      await query(
        `INSERT INTO auth_credit_transactions (user_id, type, amount, reason)
         VALUES ($1, 'credit', 10, 'Welcome bonus')`,
        [Number(userId)]
      );
    } catch {}

    return NextResponse.json({ success: true, message: 'Registration complete', data: { token, user: { id: userId, phone: cleanPhone, email, name } } });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('register-verify error:', e);
    return NextResponse.json({ success: false, message: 'Failed to verify registration' }, { status: 500 });
  }
}
