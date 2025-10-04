import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.split(' ')[1];
    if (token) {
      await query('DELETE FROM sessions WHERE token = $1', [token]);
    }
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('logout error:', e);
    return NextResponse.json({ success: false, message: 'Failed to logout' }, { status: 500 });
  }
}
