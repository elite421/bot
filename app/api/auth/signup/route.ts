import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/jwt';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { phone, email, name, password } = await req.json();
    if (!phone || !email || !name || !password) return NextResponse.json({ success: false, message: 'Phone, email, name, and password are required' }, { status: 400 });

    const cleanPhone = (() => {
      const rawDigits = String(phone).replace(/\D/g, '');
      const DEFAULT_COUNTRY_CODE = String(process.env.DEFAULT_COUNTRY_CODE || '91');
      let digits = rawDigits.replace(/^0+/, '');
      if (!digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length <= 10) {
        digits = `${DEFAULT_COUNTRY_CODE}${digits}`;
      }
      return digits;
    })();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email))) return NextResponse.json({ success: false, message: 'Please enter a valid email address' }, { status: 400 });
    if (String(password).length < 6) return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long' }, { status: 400 });

    const hashed = await bcrypt.hash(String(password), 10);

    const existRes = await query<{ id: number }>(`SELECT id FROM users WHERE phone = $1 OR email = $2 LIMIT 1`, [cleanPhone, String(email)]);
    if (existRes.rows[0]) return NextResponse.json({ success: false, message: 'User with this phone number or email already exists' }, { status: 400 });

    const createRes = await query<{ id: number }>(
      `INSERT INTO users (phone, email, name, password)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [cleanPhone, String(email), String(name), hashed]
    );
    const userId = createRes.rows[0].id;
    const token = signToken({ userId, phone: cleanPhone, email: String(email) });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO sessions (user_id, token, expires_at, auth_method)
       VALUES ($1, $2, $3, 'password')`,
      [userId, token, expiresAt]
    );

    return NextResponse.json({ success: true, message: 'Account created successfully', data: { token, user: { id: userId, phone: cleanPhone, email, name } } });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('signup error:', e);
    return NextResponse.json({ success: false, message: 'Failed to create account' }, { status: 500 });
  }
}
