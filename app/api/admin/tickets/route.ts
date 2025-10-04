import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authHelpers'
import { query } from '@/lib/db'

type TicketRow = {
  id: number;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  user_id: number;
  user_email: string | null;
  user_name: string | null;
  user_phone: string | null;
};

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = Math.min(1000, Math.max(1, Number(searchParams.get('limit') || 200)))

    const params: unknown[] = []
    let whereSql = ''
    if (status) {
      params.push(status)
      whereSql = 'WHERE t.status = $1'
    }

    const ticketsPromise = query<TicketRow>(
      `SELECT t.id, t.subject, t.message, t.status, t.created_at, t.user_id,
              u.email AS user_email, u.name AS user_name, u.phone AS user_phone
       FROM support_tickets t
       LEFT JOIN users u ON u.id = t.user_id
       ${whereSql}
       ORDER BY t.created_at DESC
       LIMIT ${limit}`,
      params
    )

    const totalCountPromise = query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM support_tickets t ${whereSql}`,
      params
    )

    const byStatusPromise = query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM support_tickets GROUP BY status`
    )

    const [ticketsRes, totalCountRes, byStatusRes] = await Promise.all([
      ticketsPromise,
      totalCountPromise,
      byStatusPromise,
    ])

    const tickets = ticketsRes.rows.map((t: TicketRow) => ({
      id: t.id,
      subject: t.subject,
      message: t.message,
      status: t.status,
      createdAt: t.created_at,
      user: { id: t.user_id, email: t.user_email, name: t.user_name, phone: t.user_phone },
    }))
    const totalCount = Number(totalCountRes.rows[0]?.count || '0')
    const byStatus = byStatusRes.rows.map((r: { status: string; count: string }) => ({ status: r.status, _count: { _all: Number(r.count || '0') } }))

    return NextResponse.json({ success: true, data: { tickets, totalCount, byStatus } }, { headers: noStoreHeaders })
  } catch (e: any) {
    // Log the actual error to the server console for debugging
    // eslint-disable-next-line no-console
    console.error('Admin tickets error:', e)
    if (e instanceof Response) return e
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const
    return NextResponse.json({ success: false, message: e?.message || 'Failed to load tickets' }, { status: 500, headers: noStoreHeaders })
  }
}
