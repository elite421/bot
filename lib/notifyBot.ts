import type { NextRequest } from 'next/server'

export type PurchasePromptReason = 'credits_exhausted' | 'inactive_90d'

const BOT_URL = process.env.BOT_SERVICE_URL || 'http://localhost:4002'
const INTERNAL_KEY = process.env.BOT_INTERNAL_KEY || 'dev-secret-key'

export async function sendWhatsAppMessage(phone: string, text: string) {
  if (!phone || !text) return { ok: false, error: 'phone and text required' } as const
  try {
    const res = await fetch(`${BOT_URL}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': INTERNAL_KEY,
      },
      body: JSON.stringify({ phone, text })
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      return { ok: false, error: `HTTP ${res.status}: ${t}` } as const
    }
    const json = await res.json().catch(() => ({}))
    if (!json?.success) return { ok: false, error: json?.message || 'Unknown bot error' } as const
    return { ok: true } as const
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Failed to send WhatsApp message' } as const
  }
}

export function formatPurchaseLink(): string {
  const publicUrl = process.env.NEXT_PUBLIC_PAYMENT_LINK_URL
  const serverUrl = process.env.PAYMENT_LINK_URL
  return (publicUrl || serverUrl || '').toString() || 'https://example.com/pricing'
}

export function formatName(firstName?: string | null): string {
  const f = (firstName || '').trim()
  if (!f) return 'there'
  return f.split(/\s+/)[0]
}

export function buildPurchaseMessage(reason: PurchasePromptReason, firstName: string, purchaseLink: string) {
  if (reason === 'credits_exhausted') {
    return `Hi ${firstName}, your 10 free auth credits have been used. To continue using the service, please buy a plan now: ${purchaseLink}. Reply BUY to purchase or STOP to unsubscribe from messages.`
  }
  return `Hi ${firstName} — we miss you! Your free trial credits are still available but you’ve been inactive for 90 days. Buy a plan to keep using the service: ${purchaseLink}. Reply BUY or STOP.`
}
