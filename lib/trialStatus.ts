import { query } from './db'

export type TrialReason = 'credits_exhausted' | 'inactive_90d' | null

export interface TrialStatus {
  trialBlocked: boolean
  reason: TrialReason
  remainingTrialCredits: number
  lastActiveAt: Date | null
  paymentsSuccessCount: number
}

const WELCOME_REASONS = ['Welcome bonus', 'Signup bonus']

export async function getTrialStatus(userId: number): Promise<TrialStatus> {
  // Fetch minimal user info
  const userRes = await query<{ created_at: string | null }>(
    'SELECT created_at FROM users WHERE id = $1 LIMIT 1',
    [userId]
  )
  const user = userRes.rows[0]
  if (!user) return { trialBlocked: false, reason: null, remainingTrialCredits: 0, lastActiveAt: null, paymentsSuccessCount: 0 }

  // Successful payments (any paid plan lifts trial block)
  const paymentsRes = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM payment_transactions WHERE user_id = $1 AND status = 'success'`,
    [userId]
  )
  const paymentsSuccessCount = Number(paymentsRes.rows[0]?.count || '0')

  // Trial credits granted (welcome credits)
  const welcomeRes = await query<{ sum: string | null }>(
    `SELECT COALESCE(SUM(amount), 0)::text AS sum
     FROM auth_credit_transactions
     WHERE user_id = $1 AND type = 'credit' AND reason = ANY($2)`,
    [userId, WELCOME_REASONS]
  )
  const trialGranted = Number(welcomeRes.rows[0]?.sum || '0')

  // Total debits consumed
  const debitRes = await query<{ sum: string | null }>(
    `SELECT COALESCE(SUM(amount), 0)::text AS sum
     FROM auth_credit_transactions
     WHERE user_id = $1 AND type = 'debit'`,
    [userId]
  )
  const totalDebits = Number(debitRes.rows[0]?.sum || '0')

  const remainingTrialCredits = Math.max(0, trialGranted - totalDebits)

  // Last activity: max(session.last_seen, user.created_at)
  const lastSessionRes = await query<{ last_seen: string | null }>(
    `SELECT MAX(last_seen) AS last_seen FROM prisma_sessions WHERE user_id = $1`,
    [userId]
  )
  const userCreatedAt = user.created_at ? new Date(user.created_at).getTime() : 0
  const sessionLastSeen = lastSessionRes.rows[0]?.last_seen ? new Date(lastSessionRes.rows[0].last_seen as any).getTime() : 0
  const lastActiveAt = new Date(Math.max(userCreatedAt, sessionLastSeen))

  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000
  const inactive90 = Date.now() - (lastActiveAt?.getTime() || 0) >= NINETY_DAYS_MS
  const creditsExhausted = trialGranted > 0 && remainingTrialCredits <= 0

  const trialBlocked = paymentsSuccessCount === 0 && (inactive90 || creditsExhausted)
  const reason: TrialReason = trialBlocked ? (creditsExhausted ? 'credits_exhausted' : 'inactive_90d') : null

  return {
    trialBlocked,
    reason,
    remainingTrialCredits,
    lastActiveAt: lastActiveAt || null,
    paymentsSuccessCount,
  }
}
