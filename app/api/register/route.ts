import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, name, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email and password are required' }, { status: 400 });
    }

    const existRes = await query<{ id: number }>(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [email]);
    if (existRes.rows[0]) {
      return NextResponse.json({ success: false, message: 'User already exists' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const ins = await query<{ id: number; email: string | null }>(
      `INSERT INTO users (email, name, password)
       VALUES ($1, $2, $3)
       RETURNING id, email`,
      [email, name || null, passwordHash]
    );
    const user = { id: ins.rows[0].id, email: ins.rows[0].email } as const;

    // Log signup welcome credit transaction (10)
    await query(
      `INSERT INTO auth_credit_transactions (user_id, type, amount, reason)
       VALUES ($1, 'credit', 10, 'Welcome bonus')`,
      [user.id]
    );

    return NextResponse.json({ success: true, data: { id: user.id, email: user.email } });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message || 'Registration failed' }, { status: 500 });
  }
}
