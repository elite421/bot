import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const currentToken = authHeader.split(' ')[1] || '';
    if (!currentToken) return NextResponse.json({ success: false, message: 'Access token required' }, { status: 401 });

    const decoded = verifyToken(currentToken);

    await query(
      `DELETE FROM sessions WHERE user_id = $1 AND token <> $2`,
      [decoded.userId, currentToken]
    );

    return NextResponse.json({ success: true, message: 'Other sessions revoked' });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('revoke-others error:', e);
    return NextResponse.json({ success: false, message: 'Failed to revoke other sessions' }, { status: 500 });
  }
}
