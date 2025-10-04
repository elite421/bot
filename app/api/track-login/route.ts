import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/authHelpers';
import { trackActiveSession } from '@/lib/sessionTracker';

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser();
    await trackActiveSession(req, user.id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ success: false, message: e?.message || 'Failed to track login' }, { status: 500 });
  }
}
