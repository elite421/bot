import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authApi';
import { query, tx } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store',
} as const;

async function ensureOrgForOwner(userId: number, name?: string) {
  // Ensure base tables exist (idempotent)
  try {
    await query(`CREATE TABLE IF NOT EXISTS organizations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      owner_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_user_id)`);
    await query(`CREATE TABLE IF NOT EXISTS organization_users (
      organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (organization_id, user_id)
    )`);
    await query(`CREATE TABLE IF NOT EXISTS org_api_tokens (
      id SERIAL PRIMARY KEY,
      organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(organization_id, token)
    )`);
    await query(`CREATE TABLE IF NOT EXISTS org_auth_credit_transactions (
      id SERIAL PRIMARY KEY,
      organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      amount INT NOT NULL,
      reason TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
  } catch {}

  const existing = await query<{ id: number; name: string }>(
    `SELECT id, name FROM organizations WHERE owner_user_id = $1 LIMIT 1`,
    [userId]
  );
  if (existing.rows[0]) return existing.rows[0];

  // Create org with welcome credits and a token
  const result = await tx(async (client) => {
    const orgName = name && name.trim() ? name.trim() : `Org-${userId}`;
    const insOrg = await client.query<{ id: number; name: string }>(
      `INSERT INTO organizations (name, owner_user_id) VALUES ($1, $2) RETURNING id, name`,
      [orgName, userId]
    );
    const org = insOrg.rows[0];
    await client.query(`INSERT INTO organization_users (organization_id, user_id, role) VALUES ($1, $2, 'owner') ON CONFLICT DO NOTHING`, [org.id, userId]);
    // Welcome credits
    await client.query(
      `INSERT INTO org_auth_credit_transactions (organization_id, type, amount, reason) VALUES ($1, 'credit', $2, 'Welcome credits')`,
      [org.id, 100]
    );
    // Token
    const token = (await import('crypto')).randomBytes(24).toString('hex');
    await client.query(`INSERT INTO org_api_tokens (organization_id, token, active) VALUES ($1, $2, true)`, [org.id, token]);
    return org;
  });
  return result;
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const userId = user.id;

    // Fetch existing org (do not autocreate on GET)
    const orgRes = await query<{ id: number; name: string }>(
      `SELECT id, name FROM organizations WHERE owner_user_id = $1 LIMIT 1`,
      [userId]
    );
    const org = orgRes.rows[0] || null;

    let members: Array<{ userId: number; role: string; name: string | null; email: string | null; phone: string | null }> = [];
    let tokens: Array<{ id: number; token: string; active: boolean; createdAt: string } > = [];
    let balance = 0;

    if (org) {
      const memRes = await query<{ user_id: number; role: string; name: string | null; email: string | null; phone: string | null }>(
        `SELECT ou.user_id, ou.role, u.name, u.email, u.phone
         FROM organization_users ou
         JOIN users u ON u.id = ou.user_id
         WHERE ou.organization_id = $1
         ORDER BY ou.role DESC, u.created_at ASC`,
        [org.id]
      );
      members = memRes.rows.map(r => ({ userId: r.user_id, role: r.role, name: r.name, email: r.email, phone: r.phone }));

      const tokRes = await query<{ id: number; token: string; active: boolean; created_at: string }>(
        `SELECT id, token, active, created_at FROM org_api_tokens WHERE organization_id = $1 ORDER BY created_at DESC`,
        [org.id]
      );
      tokens = tokRes.rows.map(r => ({ id: r.id, token: r.token, active: r.active, createdAt: r.created_at }));

      const creditRes = await query<{ balance: string }>(
        `SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount WHEN type='debit' THEN -amount ELSE 0 END),0)::text AS balance
         FROM org_auth_credit_transactions WHERE organization_id = $1`,
        [org.id]
      );
      balance = Number(creditRes.rows[0]?.balance || '0');
    }

    return NextResponse.json({ success: true, data: { org, members, tokens, balance } }, { headers: noStore });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('org GET error:', e);
    return NextResponse.json({ success: false, message: 'Failed to load organization' }, { status: 500, headers: noStore });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const { name } = await req.json().catch(() => ({ name: '' }));
    const org = await ensureOrgForOwner(user.id, name);
    return NextResponse.json({ success: true, data: { org } }, { headers: noStore });
  } catch (e: any) {
    console.error('org POST error:', e);
    return NextResponse.json({ success: false, message: 'Failed to create organization' }, { status: 500, headers: noStore });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const { name } = await req.json();
    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, message: 'Organization name is required' }, { status: 400, headers: noStore });
    }
    const orgRes = await query<{ id: number }>(`SELECT id FROM organizations WHERE owner_user_id = $1 LIMIT 1`, [user.id]);
    if (!orgRes.rows[0]) return NextResponse.json({ success: false, message: 'Organization not found' }, { status: 404, headers: noStore });
    await query(`UPDATE organizations SET name = $1, updated_at = NOW() WHERE id = $2`, [String(name).trim(), orgRes.rows[0].id]);
    return NextResponse.json({ success: true }, { headers: noStore });
  } catch (e: any) {
    console.error('org PUT error:', e);
    return NextResponse.json({ success: false, message: 'Failed to update organization' }, { status: 500, headers: noStore });
  }
}
