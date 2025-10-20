import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const internalKey = req.headers.get('x-internal-key') || ''
    const expected = process.env.BOT_INTERNAL_KEY || 'dev-secret-key'
    if (internalKey !== expected) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const { phone } = await req.json()
    const cleanPhone = String(phone || '').replace(/\D/g, '')
    if (!cleanPhone) {
      return NextResponse.json({ success: false, message: 'phone is required' }, { status: 400 })
    }

    const uRes = await query<{ id: number }>(`SELECT id FROM users WHERE phone = $1 LIMIT 1`, [cleanPhone])
    const userRow = uRes.rows[0]
    if (!userRow) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    await query(
      `INSERT INTO user_settings (user_id, notify_whatsapp)
       VALUES ($1, false)
       ON CONFLICT (user_id) DO UPDATE SET notify_whatsapp = EXCLUDED.notify_whatsapp`,
      [userRow.id]
    )

    return NextResponse.json({ success: true })
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('whatsapp-optout error:', e)
    return NextResponse.json({ success: false, message: 'Failed to opt-out' }, { status: 500 })
  }
}
