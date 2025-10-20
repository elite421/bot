import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authApi';
import { query } from '@/lib/db';

function publicApiBase() {
  return process.env.PUBLIC_API_BASE || `http://localhost:${process.env.PORT || 3000}`;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const userId = user.id;

    // Load existing keys
    const existingRes = await query<{ type: string; apiKey: string; active: boolean }>(
      `SELECT type, api_key AS "apiKey", active FROM api_keys WHERE user_id = $1`,
      [userId]
    );
    type KeyInfo = { api_key: string; active: boolean };
    const map: Map<string, KeyInfo> = new Map<string, KeyInfo>(
      existingRes.rows.map((r) => [r.type, { api_key: r.apiKey, active: r.active }])
    );

    // Ensure live key
    if (!map.has('live')) {
      const key = `rvotp_live_${cryptoRandom(24)}`;
      await query(
        `INSERT INTO api_keys (user_id, api_key, type, active) VALUES ($1, $2, 'live', true)`,
        [userId, key]
      );
      map.set('live', { api_key: key, active: true });
    } else if (map.get('live') && map.get('live')!.active === false) {
      await query(`UPDATE api_keys SET active = true WHERE user_id = $1 AND type = 'live'`, [userId]);
    }

    // Ensure test key
    if (!map.has('test')) {
      const key = `rvotp_test_${cryptoRandom(24)}`;
      await query(
        `INSERT INTO api_keys (user_id, api_key, type, active) VALUES ($1, $2, 'test', true)`,
        [userId, key]
      );
      map.set('test', { api_key: key, active: true });
    } else if (map.get('test') && map.get('test')!.active === false) {
      await query(`UPDATE api_keys SET active = true WHERE user_id = $1 AND type = 'test'`, [userId]);
    }

    // Ensure webhook token
    const wt = await query<{ token: string }>(`SELECT token FROM webhook_tokens WHERE user_id = $1`, [userId]);
    let token = wt.rows[0]?.token || null;
    if (!token) {
      token = cryptoRandom(24);
      await query(`INSERT INTO webhook_tokens (user_id, token) VALUES ($1, $2)`, [userId, token]);
    }

    const data = {
      live: (map.get('live') as KeyInfo).api_key,
      test: (map.get('test') as KeyInfo).api_key,
      webhookToken: token,
    } as const;

    const webhookUrl = `${publicApiBase()}/api/webhook/incoming/${data.webhookToken}`;
    return NextResponse.json({ success: true, data: { keys: { live: data.live, test: data.test }, webhookUrl } });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('credentials GET error:', e);
    const msg = /Access token required|Invalid or expired session/.test(String(e?.message)) ? e.message : 'Failed to load credentials';
    const status = msg === 'Access token required' || msg === 'Invalid or expired session' ? 401 : 500;
    return NextResponse.json({ success: false, message: msg }, { status });
  }
}

function cryptoRandom(bytes: number) {
  const b = require('crypto').randomBytes(bytes);
  return b.toString('hex');
}
