import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authHelpers';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(1000, Math.max(1, Number(searchParams.get('limit') || 200)));

    const res = await query<{
      user_id: number;
      notify_whatsapp: boolean;
      notify_email: boolean | null;
      login_alerts: boolean | null;
      compact_mode: boolean | null;
      language: string | null;
      session_expire: number | null;
      created_at: string;
    }>(
      `SELECT user_id, notify_whatsapp, notify_email, login_alerts, compact_mode, language, session_expire, created_at
       FROM user_settings
       ORDER BY created_at DESC
       LIMIT ${limit}`
    );

    const data = res.rows.map((r) => ({
      userId: r.user_id,
      notifyWhatsapp: r.notify_whatsapp,
      notifyEmail: r.notify_email,
      loginAlerts: r.login_alerts,
      compactMode: r.compact_mode,
      language: r.language,
      sessionExpire: r.session_expire,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('Admin user-settings error:', e);
    if (e instanceof Response) return e;
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const;
    return NextResponse.json({ success: false, message: e?.message || 'Failed to load user settings' }, { status: 500, headers: noStoreHeaders });
  }
}
