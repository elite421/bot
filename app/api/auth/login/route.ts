import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/jwt';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();
    if (!identifier || !password) return NextResponse.json({ success: false, message: 'Phone/email and password are required' }, { status: 400 });

    const isEmail = String(identifier).includes('@');
    const cleanIdentifier = isEmail ? String(identifier) : (() => {
      const rawDigits = String(identifier).replace(/\D/g, '');
      const DEFAULT_COUNTRY_CODE = String(process.env.DEFAULT_COUNTRY_CODE || '91');
      let digits = rawDigits.replace(/^0+/, '');
      if (!digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length <= 10) {
        digits = `${DEFAULT_COUNTRY_CODE}${digits}`;
      }
      return digits;
    })();
    const { rows } = await query<{ id: number; phone: string | null; email: string | null; name: string | null; password: string | null; is_blocked: boolean }>(
      isEmail
        ? `SELECT id, phone, email, name, password, is_blocked FROM users WHERE email = $1 LIMIT 1`
        : `SELECT id, phone, email, name, password, is_blocked FROM users WHERE phone = $1 LIMIT 1`,
      [cleanIdentifier]
    );
    const user = rows[0];
    if (!user) return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 400 });

    // Blocked check
    if ((user as any).is_blocked) return NextResponse.json({ success: false, message: 'Your account is blocked. Please contact support.' }, { status: 403 });

    if (!(user as any).password) return NextResponse.json({ success: false, message: 'This account was created with QR login. Please use QR code to login.' }, { status: 400 });

    const ok = await bcrypt.compare(String(password), String((user as any).password));
    if (!ok) return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 400 });

    const token = signToken({ userId: (user as any).id, phone: (user as any).phone, email: (user as any).email || undefined });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO sessions (user_id, token, expires_at, auth_method)
       VALUES ($1, $2, $3, 'password')`,
      [(user as any).id, token, expiresAt]
    );

    return NextResponse.json({ success: true, message: 'Login successful', data: { token, user: { id: (user as any).id, phone: (user as any).phone, email: (user as any).email, name: (user as any).name } } });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('login error:', e);
    return NextResponse.json({ success: false, message: 'Failed to login' }, { status: 500 });
  }
}
