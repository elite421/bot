import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireAuth(req as any);
    // Placeholder dataset; integrate real transactions later
    return NextResponse.json({ success: true, data: [] });
  } catch (e: any) {
    const msg = /Access token required|Invalid or expired session/.test(String(e?.message)) ? e.message : 'Failed to load transactions';
    const status = msg === 'Access token required' || msg === 'Invalid or expired session' ? 401 : 500;
    return NextResponse.json({ success: false, message: msg }, { status });
  }
}
