import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireAuth } from '@/lib/authApi';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function sendGreeting(phone: string, name: string | null) {
  try {
    const botUrl = process.env.BOT_SERVICE_URL || 'http://localhost:4002';
    const internalKey = process.env.BOT_INTERNAL_KEY || 'dev-secret-key';
    const appName = process.env.APP_NAME || 'TruOTP';
    const text = `🎉 Welcome to ${appName}${name ? `, ${name}` : ''}! Your account is now verified. If you need any help, just reply here.`;
    const res = await fetch(`${botUrl}/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': internalKey },
      body: JSON.stringify({ phone, text })
    });
    return res.ok;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('sendGreeting error:', e);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Require authenticated session (token from QR verification)
    const { user } = await requireAuth(req);

    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ success: false, message: 'Name, email, and password are required' }, { status: 400 });
    }

    const cleanEmail = String(email).trim();
    const hashed = await bcrypt.hash(String(password), 10);

    // Ensure email is not taken by someone else
    const dupRes = await query<{ id: number }>(`SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1`, [cleanEmail, Number(user.id)]);
    const dup = dupRes.rows[0];
    const result = dup ? { ok: false, reason: 'Email already in use' } as const : { ok: true } as const;

    if (result.ok) {
      await query(
        `UPDATE users SET name = $1, email = $2, password = $3, is_verified = true WHERE id = $4`,
        [String(name), cleanEmail, hashed, Number(user.id)]
      );
    }

    if (!(result as any).ok) {
      const reason = (result as any).reason || 'Failed to update profile';
      return NextResponse.json({ success: false, message: reason }, { status: 400 });
    }

    // Welcome credits (same behavior as OTP flow)
    try {
      await query(
        `INSERT INTO auth_credit_transactions (user_id, type, amount, reason)
         VALUES ($1, 'credit', 10, 'Welcome bonus')`,
        [Number(user.id)]
      );
    } catch {}

    // Send greeting message via bot (best-effort)
    try { await sendGreeting(String(user.phone || ''), String(name)); } catch {}

    return NextResponse.json({ success: true, message: 'Registration completed' });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('complete-registration error:', e);
    return NextResponse.json({ success: false, message: 'Failed to complete registration' }, { status: 500 });
  }
}
