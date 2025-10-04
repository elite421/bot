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
      return NextResponse.json({ success: false, message: 'Invalid user id' }, { status: 400, headers: noStoreHeaders })
    }

    const body = await req.json().catch(() => ({})) as { isBlocked?: boolean }
    if (typeof body.isBlocked !== 'boolean') {
      return NextResponse.json({ success: false, message: 'isBlocked boolean is required' }, { status: 400, headers: noStoreHeaders })
    }

    const upd = await query(
      `UPDATE users
       SET is_blocked = $1
       WHERE id = $2
       RETURNING id, email, name, role, is_blocked, created_at`,
      [body.isBlocked, id]
    )
    if (upd.rowCount === 0) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404, headers: noStoreHeaders })
    }
    const row = upd.rows[0] as any
    const user = {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      isBlocked: row.is_blocked,
      createdAt: row.created_at,
    }

    return NextResponse.json({ success: true, data: user }, { headers: noStoreHeaders })
  } catch (e: any) {
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const
    if (e instanceof Response) return e
    return NextResponse.json({ success: false, message: e?.message || 'Failed to update user block status' }, { status: 500, headers: noStoreHeaders })
  }
}
