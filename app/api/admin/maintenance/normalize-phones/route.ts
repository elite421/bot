import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authHelpers';
import { tx } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeIN(d: string): string | null {
  const raw = String(d || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!raw) return null;
  const cc = String(process.env.DEFAULT_COUNTRY_CODE || '91');
  if (raw.startsWith(cc)) return raw;
  if (raw.length <= 10) return `${cc}${raw}`;
  return raw;
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const;

    const { dryRun } = await req.json().catch(() => ({ dryRun: true }));

    const result = await tx(async (client) => {
      const usersRes = await client.query<{ id: number; phone: string | null }>(
        `SELECT id, phone FROM users WHERE phone IS NOT NULL`
      );
      const candidates: Array<{ id: number; old: string; next: string }> = [];
      for (const row of usersRes.rows) {
        const old = String(row.phone || '');
        const next = normalizeIN(old);
        if (next && next !== old) {
          candidates.push({ id: row.id, old, next });
        }
      }
      let updated = 0;
      if (!dryRun) {
        for (const c of candidates) {
          await client.query(`UPDATE users SET phone = $1 WHERE id = $2`, [c.next, c.id]);
          updated++;
        }
      }
      return { total: usersRes.rowCount || 0, toUpdate: candidates.length, updated, sample: candidates.slice(0, 20) };
    });

    return NextResponse.json({ success: true, data: result, dryRun: !!dryRun }, { headers: noStoreHeaders });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('normalize-phones error:', e);
    if (e instanceof Response) return e;
    return NextResponse.json({ success: false, message: e?.message || 'Failed to normalize phones' }, { status: 500 });
  }
}
