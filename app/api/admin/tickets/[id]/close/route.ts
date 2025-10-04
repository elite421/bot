import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authHelpers'
import { query } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const
    const { id: idParam } = await params
    const id = Number(idParam)
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ success: false, message: 'Invalid ticket id' }, { status: 400, headers: noStoreHeaders })
    }

    const upd = await query<{ id: number }>(
      `UPDATE support_tickets SET status = 'Closed' WHERE id = $1 RETURNING id`,
      [id]
    )
    if (upd.rowCount === 0) {
      return NextResponse.json({ success: false, message: 'Ticket not found' }, { status: 404, headers: noStoreHeaders })
    }
    const rowRes = await query<{
      id: number; subject: string; message: string; status: string; created_at: string; user_id: number;
      email: string | null; name: string | null; phone: string | null;
    }>(
      `SELECT t.id, t.subject, t.message, t.status, t.created_at, t.user_id,
              u.email, u.name, u.phone
       FROM support_tickets t
       LEFT JOIN users u ON u.id = t.user_id
       WHERE t.id = $1
       LIMIT 1`,
      [id]
    )
    const t = rowRes.rows[0]
    const ticket = {
      id: t.id,
      subject: t.subject,
      message: t.message,
      status: t.status,
      createdAt: t.created_at,
      user: { id: t.user_id, email: t.email, name: t.name, phone: t.phone },
    }

    return NextResponse.json({ success: true, data: ticket }, { headers: noStoreHeaders })
  } catch (e: any) {
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const
    if (e instanceof Response) return e
    return NextResponse.json({ success: false, message: e?.message || 'Failed to close ticket' }, { status: 500, headers: noStoreHeaders })
  }
}
