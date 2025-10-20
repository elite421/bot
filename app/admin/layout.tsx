import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  let session: Session | null = null;
  try {
    session = await getServerSession(authOptions);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[admin/layout] getServerSession failed', e);
    redirect('/admin-login');
  }
  const role = (session as any)?.user?.role ?? 'user';
  if (!session || role !== 'admin') {
    redirect('/admin-login');
  }
  return <>{children}</>;
}
