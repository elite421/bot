import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Middleware: allow either NextAuth session (for admin) or Bearer JWT (for app APIs)
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const noStoreHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
  } as const;

  // Public API paths (handled by route-level auth)
  const publicPrefixes = ['/api/auth', '/api/register', '/api/dashboard', '/api/credentials', '/api/track-login', '/api/contact', '/api/public'];
  if (publicPrefixes.some((p) => pathname.startsWith(p))) return NextResponse.next();

  if (!pathname.startsWith('/api/')) return NextResponse.next();

  // Admin APIs strictly require NextAuth session
  if (pathname.startsWith('/api/admin')) {
    const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401, headers: noStoreHeaders });
    if ((session as any).role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403, headers: noStoreHeaders });
    }
    return NextResponse.next();
  }

  // For other API routes, accept either Bearer JWT or NextAuth session
  const hasBearer = !!(req.headers.get('authorization') || '').split(' ')[1];
  if (hasBearer) return NextResponse.next();

  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (session) return NextResponse.next();

  return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401, headers: noStoreHeaders });
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
