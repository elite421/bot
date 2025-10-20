import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authApi';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const res = await query<{
      notify_whatsapp: boolean | null;
      notify_email: boolean | null;
      login_alerts: boolean | null;
      compact_mode: boolean | null;
      language: string | null;
      session_expire: number | null;
    }>(`SELECT notify_whatsapp, notify_email, login_alerts, compact_mode, language, session_expire FROM user_settings WHERE user_id = $1`, [user.id]);
    const row = res.rows[0] || null;

    return NextResponse.json({
      success: true,
      data: {
        notifyEmail: !!row?.notify_email,
        notifyWhatsApp: row?.notify_whatsapp ?? true,
        loginAlerts: !!row?.login_alerts,
        compactMode: !!row?.compact_mode,
        language: row?.language || 'en',
        sessionExpire: row?.session_expire || 120,
      },
    });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('settings GET error:', e);
    const msg = /Access token required|Invalid or expired session/.test(String(e?.message)) ? e.message : 'Failed to load settings';
    const status = msg === 'Access token required' || msg === 'Invalid or expired session' ? 401 : 500;
    return NextResponse.json({ success: false, message: msg }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const body = await req.json();
    const notifyEmail = !!body.notifyEmail;
    const notifyWhatsApp = !!body.notifyWhatsApp;
    const loginAlerts = !!body.loginAlerts;
    const compactMode = !!body.compactMode;
    const language = String(body.language || 'en');
    const sessionExpire = Math.min(180, Math.max(60, Number(body.sessionExpire) || 120));

    await query(
      `INSERT INTO user_settings (user_id, notify_email, notify_whatsapp, login_alerts, compact_mode, language, session_expire, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET notify_email = EXCLUDED.notify_email,
                     notify_whatsapp = EXCLUDED.notify_whatsapp,
                     login_alerts = EXCLUDED.login_alerts,
                     compact_mode = EXCLUDED.compact_mode,
                     language = EXCLUDED.language,
                     session_expire = EXCLUDED.session_expire`,
      [user.id, notifyEmail, notifyWhatsApp, loginAlerts, compactMode, language, sessionExpire]
    );

    return NextResponse.json({ success: true, message: 'Settings updated' });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('settings PUT error:', e);
    const msg = /Access token required|Invalid or expired session/.test(String(e?.message)) ? e.message : 'Failed to update settings';
    const status = msg === 'Access token required' || msg === 'Invalid or expired session' ? 401 : 500;
    return NextResponse.json({ success: false, message: msg }, { status });
  }
}
