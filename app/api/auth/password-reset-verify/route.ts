import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/jwt';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { phone, email, code, newPassword } = await req.json();
    if ((!phone && !email) || !code || !newPassword) {
      return NextResponse.json({ success: false, message: 'Phone/email, OTP code, and new password are required' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(String(newPassword), 10);

    let cleanPhone = '';
    if (phone) {
      cleanPhone = String(phone).replace(/\D/g, '');
    } else {
      const u = await query<{ phone: string | null }>(`SELECT phone FROM users WHERE email = $1 LIMIT 1`, [String(email)]);
      const row = u.rows[0];
      if (row?.phone) cleanPhone = String(row.phone);
    }
    if (!cleanPhone) return NextResponse.json({ success: false, message: 'No phone linked to this account' }, { status: 400 });

    const otpRes = await query<{ id: number }>(
      `SELECT id FROM otp_requests
       WHERE phone = $1 AND type = 'reset' AND code = $2 AND consumed = false AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [cleanPhone, String(code)]
    );
    const otp = otpRes.rows[0];
    if (!otp) return NextResponse.json({ success: false, message: 'Invalid OTP' }, { status: 400 });

    const userRes = await query<{ id: number; email: string | null; name: string | null; is_blocked: boolean }>(
      `SELECT id, email, name, is_blocked FROM users WHERE phone = $1 LIMIT 1`,
      [cleanPhone]
    );
    const userRow = userRes.rows[0];
    if (!userRow) return NextResponse.json({ success: false, message: 'User not found' }, { status: 400 });
    if ((userRow as any).is_blocked) return NextResponse.json({ success: false, message: 'Your account is blocked. Please contact support.' }, { status: 403 });

    await query(`UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`, [hashed, (userRow as any).id]);
    await query(`UPDATE otp_requests SET consumed = true, verified_at = NOW() WHERE id = $1`, [otp.id]);

    const token = signToken({ userId: (userRow as any).id, phone: cleanPhone, email: (userRow as any).email });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO sessions (user_id, token, expires_at, auth_method)
       VALUES ($1, $2, $3, 'password')`,
      [(userRow as any).id, token, expiresAt]
    );

    return NextResponse.json({ success: true, message: 'Password updated', data: { ok: true, token, user: { id: (userRow as any).id, phone: cleanPhone, email: (userRow as any).email, name: (userRow as any).name } } });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('password-reset-verify error:', e);
    return NextResponse.json({ success: false, message: 'Failed to reset password' }, { status: 500 });
  }
}
