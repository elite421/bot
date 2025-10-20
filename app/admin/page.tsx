"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from 'next-auth/react';

type AdminSummary = {
  totalUsers: number;
  sessionsByMethod: { auth_method: string; count: number }[];
  sessionsLast24h: { auth_method: string; count: number }[];
  timestamp: string;
  totalTickets?: number;
};

type AdminUser = {
  id: number;
  phone: string | null;
  email: string | null;
  name: string | null;
  created_at: string;
  role: string;
  isBlocked?: boolean;
  totalAuthCredits: number;
  last_login_at: string | null;
};

type SupportTicket = {
  id: number;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  user: { id: number; email: string | null; name: string | null; phone: string | null };
};

type AdminAuthLog = {
  id: number;
  user_id: number;
  phone: string | null;
  email: string | null;
  name: string | null;
  auth_method: string | null;
  created_at: string;
  expires_at: string;
};

// Additional admin dataset types
type ContactMessage = {
  id: number;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
};

type LoginRequest = {
  id: number;
  phone: string;
  hash: string;
  verified: boolean;
  expiresAt: string;
  createdAt: string;
  verifiedAt: string | null;
  lastFailedReason: string | null;
  lastFailedAt: string | null;
};

type OtpRequest = {
  id: number;
  phone: string;
  type: string;
  consumed: boolean;
  expiresAt: string;
  createdAt: string;
  verifiedAt: string | null;
};

type SessionRec = {
  id: number;
  userId: number;
  token: string;
  expiresAt: string;
  authMethod: string | null;
  createdAt: string;
};

type PrismaSessionRec = {
  id: number;
  userId: number;
  ip: string | null;
  userAgent: string | null;
  deviceInfo: any;
  createdAt: string;
  lastSeen: string;
};

type ApiResponse<T> = { success: boolean; data: T; message?: string };

export default function AdminPage() {
  const router = useRouter();


  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [authLogs, setAuthLogs] = useState<AdminAuthLog[]>([]); // will hold transactions now
  const [usageLogs, setUsageLogs] = useState<AdminAuthLog[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsTotal, setTicketsTotal] = useState<number>(0);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [loginRequests, setLoginRequests] = useState<LoginRequest[]>([]);
  const [otpRequests, setOtpRequests] = useState<OtpRequest[]>([]);
  const [sessions, setSessions] = useState<SessionRec[]>([]);
  const [prismaSessions, setPrismaSessions] = useState<PrismaSessionRec[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [query, setQuery] = useState("");
  const [roleSavingId, setRoleSavingId] = useState<number | null>(null);
  const [blockSavingId, setBlockSavingId] = useState<number | null>(null);
  const [closingTicketId, setClosingTicketId] = useState<number | null>(null);
  const [ticketStatus, setTicketStatus] = useState<'All' | 'Open' | 'Closed'>('All');
  const [maintLoading, setMaintLoading] = useState(false);
  const [maintResult, setMaintResult] = useState<any>(null);

  const authHeaders = (): HeadersInit => ({
    "Content-Type": "application/json"
  });

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const ticketsUrl = `/api/admin/tickets${ticketStatus && ticketStatus !== 'All' ? `?status=${encodeURIComponent(ticketStatus)}` : ''}`;
      const [sRes, uRes, lRes, ulRes, tRes, cmRes, lrRes, orRes, ssRes, psRes] = await Promise.all([
        fetch(`/api/admin/summary`, { headers: authHeaders(), credentials: 'same-origin', cache: 'no-store' }),
        fetch(`/api/admin/users${query ? `?q=${encodeURIComponent(query)}` : ""}`, { headers: authHeaders(), credentials: 'same-origin', cache: 'no-store' }),
        fetch(`/api/admin/transactions`, { headers: authHeaders(), credentials: 'same-origin', cache: 'no-store' }),
        fetch(`/api/admin/usage-logs`, { headers: authHeaders(), credentials: 'same-origin', cache: 'no-store' }),
        fetch(ticketsUrl, { headers: authHeaders(), credentials: 'same-origin', cache: 'no-store' }),
        fetch(`/api/admin/contact-messages`, { headers: authHeaders(), credentials: 'same-origin', cache: 'no-store' }),
        fetch(`/api/admin/login-requests`, { headers: authHeaders(), credentials: 'same-origin', cache: 'no-store' }),
        fetch(`/api/admin/otp-requests`, { headers: authHeaders(), credentials: 'same-origin', cache: 'no-store' }),
        fetch(`/api/admin/sessions`, { headers: authHeaders(), credentials: 'same-origin', cache: 'no-store' }),
        fetch(`/api/admin/prisma-sessions`, { headers: authHeaders(), credentials: 'same-origin', cache: 'no-store' }),
      ]);

      // Handle 401/403 explicitly
      if ([sRes, uRes, lRes, ulRes, tRes, cmRes, lrRes, orRes, ssRes, psRes].some(r => r.status === 401)) {
        setError("Unauthorized. Please sign in.");
        router.replace('/admin-login');
        return;
      }
      if ([sRes, uRes, lRes, ulRes, tRes, cmRes, lrRes, orRes, ssRes, psRes].some(r => r.status === 403)) {
        setError("Forbidden. Your account does not have admin access.");
        router.replace('/admin-login');
        return;
      }

      if (!sRes.ok) throw new Error(`Summary failed (${sRes.status})`);
      if (!uRes.ok) throw new Error(`Users failed (${uRes.status})`);
      if (!lRes.ok) throw new Error(`Transactions failed (${lRes.status})`);
      if (!ulRes.ok) throw new Error(`Usage logs failed (${ulRes.status})`);
      if (!tRes.ok) throw new Error(`Tickets failed (${tRes.status})`);
      if (!cmRes.ok) throw new Error(`Contact messages failed (${cmRes.status})`);
      if (!lrRes.ok) throw new Error(`Login requests failed (${lrRes.status})`);
      if (!orRes.ok) throw new Error(`OTP requests failed (${orRes.status})`);
      if (!ssRes.ok) throw new Error(`Sessions failed (${ssRes.status})`);
      if (!psRes.ok) throw new Error(`Prisma sessions failed (${psRes.status})`);

      const sJson: ApiResponse<AdminSummary> = await sRes.json();
      const uJson: ApiResponse<AdminUser[]> = await uRes.json();
      const lJson: ApiResponse<any> = await lRes.json();
      const ulJson: ApiResponse<AdminAuthLog[]> = await ulRes.json();
      const tJson: ApiResponse<{ tickets: SupportTicket[]; totalCount: number; byStatus: { status: string; _count: { _all: number } }[] }>
        = await tRes.json();
      const cmJson: ApiResponse<ContactMessage[]> = await cmRes.json();
      const lrJson: ApiResponse<LoginRequest[]> = await lrRes.json();
      const orJson: ApiResponse<OtpRequest[]> = await orRes.json();
      const ssJson: ApiResponse<SessionRec[]> = await ssRes.json();
      const psJson: ApiResponse<PrismaSessionRec[]> = await psRes.json();
      if (!sJson.success) throw new Error(sJson.message || "Summary error");
      if (!uJson.success) throw new Error(uJson.message || "Users error");
      if (!lJson.success) throw new Error(lJson.message || "Transactions error");
      if (!ulJson.success) throw new Error(ulJson.message || "Usage logs error");
      if (!tJson.success) throw new Error(tJson.message || "Tickets error");
      if (!cmJson.success) throw new Error(cmJson.message || "Contact messages error");
      if (!lrJson.success) throw new Error(lrJson.message || "Login requests error");
      if (!orJson.success) throw new Error(orJson.message || "OTP requests error");
      if (!ssJson.success) throw new Error(ssJson.message || "Sessions error");
      if (!psJson.success) throw new Error(psJson.message || "Prisma sessions error");
      setSummary(sJson.data);
      setUsers(uJson.data);
      setAuthLogs(lJson.data);
      setUsageLogs(ulJson.data);
      setTickets(tJson.data.tickets);
      setTicketsTotal(tJson.data.totalCount);
      setContactMessages(cmJson.data);
      setLoginRequests(lrJson.data);
      setOtpRequests(orJson.data);
      setSessions(ssJson.data);
      setPrismaSessions(psJson.data);
    } catch (e: any) {
      setError(e?.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const toggleBlock = async (id: number, isBlocked: boolean) => {
    setBlockSavingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}/block`, {
        method: 'PATCH',
        headers: authHeaders(),
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ isBlocked }),
      });
      if (res.status === 401) {
        setError("Unauthorized. Please sign in again.");
        router.replace("/admin-login");
        return;
      }
      if (res.status === 403) {
        setError("Forbidden. Your account does not have admin access.");
        return;
      }
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Failed to update block status (${res.status}): ${t}`);
      }
      const json: ApiResponse<AdminUser> = await res.json();
      if (!json.success) throw new Error(json.message || 'Update failed');
      setUsers((prev) => prev.map(u => u.id === id ? { ...u, isBlocked: json.data.isBlocked } : u));
    } catch (e: any) {
      setError(e?.message || 'Failed to update block status');
    } finally {
      setBlockSavingId(null);
    }
  };

  const changeUserRole = async (id: number, role: 'user' | 'admin') => {
    setRoleSavingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: 'PATCH',
        headers: authHeaders(),
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ role })
      });
      if (res.status === 401) {
        setError("Unauthorized. Please sign in again.");
        router.replace("/admin-login");
        return;
      }
      if (res.status === 403) {
        setError("Forbidden. Your account does not have admin access.");
        return;
      }
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Failed to update role (${res.status}): ${t}`);
      }
      const json: ApiResponse<AdminUser> = await res.json();
      if (!json.success) throw new Error(json.message || 'Update failed');
      // Update local state
      setUsers((prev) => prev.map(u => u.id === id ? { ...u, role: json.data.role } : u));
    } catch (e: any) {
      setError(e?.message || 'Failed to update role');
    } finally {
      setRoleSavingId(null);
    }
  };

  const closeTicket = async (id: number) => {
    setClosingTicketId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/tickets/${id}/close`, {
        method: 'PATCH',
        headers: authHeaders(),
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (res.status === 401) {
        setError("Unauthorized. Please sign in again.");
        router.replace("/admin-login");
        return;
      }
      if (res.status === 403) {
        setError("Forbidden. Your account does not have admin access.");
        return;
      }
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Failed to close ticket (${res.status}): ${t}`);
      }
      const json: ApiResponse<SupportTicket> = await res.json();
      if (!json.success) throw new Error(json.message || 'Close failed');
      setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status: 'Closed' } : t));
    } catch (e: any) {
      setError(e?.message || 'Failed to close ticket');
    } finally {
      setClosingTicketId(null);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload data when ticket status filter changes
  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketStatus]);

  // Refresh on tab focus or when page is restored from BFCache
  useEffect(() => {
    const onFocus = () => {
      loadAll();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      // When navigating back, BFCache can restore stale UI; refetch to sync
      if ((e as any).persisted) {
        loadAll();
      } else {
        loadAll();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadAll();
      }
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageShow as any);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageShow as any);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            disabled={loading}
            className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            Refresh
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/admin-login' })}
            className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/20"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {(
          <>
            {/* Summary */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/10 border border-white/20 rounded p-4">
                <div className="text-white/70 text-sm">Total Users</div>
                <div className="text-3xl font-bold">{summary?.totalUsers ?? "—"}</div>
              </div>
              <div className="bg-white/10 border border-white/20 rounded p-4">
                <div className="text-white/70 text-sm">Sessions by Method (All-time)</div>
                <ul className="mt-2 space-y-1 text-sm">
                  {summary?.sessionsByMethod?.length ? (
                    summary.sessionsByMethod.map((s) => (
                      <li key={`all-${s.auth_method}`} className="flex justify-between">
                        <span className="capitalize">{s.auth_method || "unknown"}</span>
                        <span className="font-medium">{s.count}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-white/60">No data</li>
                  )}
                </ul>
              </div>
              <div className="bg-white/10 border border-white/20 rounded p-4">
                <div className="text-white/70 text-sm">Sessions by Method (24h)</div>
                <ul className="mt-2 space-y-1 text-sm">
                  {summary?.sessionsLast24h?.length ? (
                    summary.sessionsLast24h.map((s) => (
                      <li key={`24h-${s.auth_method}`} className="flex justify-between">
                        <span className="capitalize">{s.auth_method || "unknown"}</span>
                        <span className="font-medium">{s.count}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-white/60">No recent sessions</li>
                  )}
                </ul>
              </div>
              <div className="bg-white/10 border border-white/20 rounded p-4">
                <div className="text-white/70 text-sm">Total Tickets</div>
                <div className="text-3xl font-bold">{summary?.totalTickets ?? ticketsTotal ?? "—"}</div>
              </div>
              <div className="bg-white/10 border border-white/20 rounded p-4">
                <div className="text-white/70 text-sm">Contact Messages</div>
                <div className="text-3xl font-bold">{(summary as any)?.totalContactMessages ?? "—"}</div>
              </div>
              <div className="bg-white/10 border border-white/20 rounded p-4">
                <div className="text-white/70 text-sm">Login Requests</div>
                <div className="text-3xl font-bold">{(summary as any)?.totalLoginRequests ?? "—"}</div>
              </div>
              <div className="bg-white/10 border border-white/20 rounded p-4">
                <div className="text-white/70 text-sm">OTP Requests</div>
                <div className="text-3xl font-bold">{(summary as any)?.totalOtpRequests ?? "—"}</div>
              </div>
              <div className="bg-white/10 border border-white/20 rounded p-4">
                <div className="text-white/70 text-sm">Auth Sessions</div>
                <div className="text-3xl font-bold">{(summary as any)?.totalSessions ?? "—"}</div>
              </div>
            </section>

            {/* Usage Logs */}
            <section className="bg-white/10 border border-white/20 rounded">
              <div className="p-4 flex items-center justify-between">
                <h2 className="text-lg font-medium">Usage Logs</h2>
                <div className="text-sm text-white/60">Latest 200</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2 px-3">ID</th>
                      <th className="text-left py-2 px-3">User</th>
                      <th className="text-left py-2 px-3">Type</th>
                      <th className="text-left py-2 px-3">Amount</th>
                      <th className="text-left py-2 px-3">Reason</th>
                      <th className="text-left py-2 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(usageLogs) && usageLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-white/60 py-6">No usage logs</td>
                      </tr>
                    ) : (
                      (usageLogs as any[]).map((log: any) => (
                        <tr key={log.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-2 px-3">{log.id}</td>
                          <td className="py-2 px-3">{log.user?.email || log.userId}</td>
                          <td className="py-2 px-3 capitalize">{log.type}</td>
                          <td className="py-2 px-3">{log.amount}</td>
                          <td className="py-2 px-3">{log.reason}</td>
                          <td className="py-2 px-3">{log.timestamp}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Users */}
            <section className="bg-white/10 border border-white/20 rounded">
              <div className="p-4 flex items-center justify-between">
                <h2 className="text-lg font-medium">Users</h2>
                <div className="flex items-center gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or email"
                    className="px-3 py-2 rounded bg-white/10 border border-white/20 outline-none focus:ring-2 focus:ring-white/30"
                  />
                  <button
                    onClick={loadAll}
                    className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700"
                  >
                    Search
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2 px-3">ID</th>
                      <th className="text-left py-2 px-3">Email</th>
                      <th className="text-left py-2 px-3">Name</th>
                      <th className="text-left py-2 px-3">Credits</th>
                      <th className="text-left py-2 px-3">Role</th>
                      <th className="text-left py-2 px-3">Status</th>
                      <th className="text-left py-2 px-3">Actions</th>
                      <th className="text-left py-2 px-3">Last Login</th>
                      <th className="text-left py-2 px-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center text-white/60 py-6">No users</td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-2 px-3">{u.id}</td>
                          <td className="py-2 px-3">{u.email || '—'}</td>
                          <td className="py-2 px-3">{u.name || '—'}</td>
                          <td className="py-2 px-3">{u.totalAuthCredits}</td>
                          <td className="py-2 px-3">
                            <select
                              value={(u.role || 'user').toLowerCase()}
                              onChange={(e) => changeUserRole(u.id, e.target.value as 'user' | 'admin')}
                              disabled={roleSavingId === u.id || loading}
                              className="bg-white/10 border border-white/20 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-white/30"
                            >
                              <option value="user">user</option>
                              <option value="admin">admin</option>
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            {u.isBlocked ? (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-red-600/20 border border-red-600/40 text-red-200">Blocked</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-600/20 border border-green-600/40 text-green-200">Active</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <button
                              onClick={() => toggleBlock(u.id, !u.isBlocked)}
                              disabled={blockSavingId === u.id || loading}
                              className={`px-3 py-1 rounded ${u.isBlocked ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}
                            >
                              {u.isBlocked ? 'Unblock' : 'Block'}
                            </button>
                          </td>
                          <td className="py-2 px-3">{u.last_login_at || '—'}</td>
                          <td className="py-2 px-3">{u.created_at}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Transactions (latest) */}
            <section className="bg-white/10 border border-white/20 rounded">
              <div className="p-4 flex items-center justify-between">
                <h2 className="text-lg font-medium">Recent Transactions</h2>
                <div className="text-sm text-white/60">Latest 200</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2 px-3">ID</th>
                      <th className="text-left py-2 px-3">User</th>
                      <th className="text-left py-2 px-3">Package</th>
                      <th className="text-left py-2 px-3">Status</th>
                      <th className="text-left py-2 px-3">Credits</th>
                      <th className="text-left py-2 px-3">Method</th>
                      <th className="text-left py-2 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(authLogs) && authLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center text-white/60 py-6">No transactions</td>
                      </tr>
                    ) : (
                      (authLogs as any[]).map((tx: any) => (
                        <tr key={tx.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-2 px-3">{tx.id}</td>
                          <td className="py-2 px-3">{tx.user?.email || tx.user?.id}</td>
                          <td className="py-2 px-3">{tx.package?.name || '—'}</td>
                          <td className="py-2 px-3 capitalize">{tx.status}</td>
                          <td className="py-2 px-3">{tx.creditsPurchased}</td>
                          <td className="py-2 px-3">{tx.method}</td>
                          <td className="py-2 px-3">{tx.timestamp}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Support Tickets */}
            <section className="bg-white/10 border border-white/20 rounded">
              <div className="p-4 flex items-center justify-between">
                <h2 className="text-lg font-medium">Support Tickets</h2>
                <div className="flex items-center gap-3">
                  <label htmlFor="ticketStatus" className="text-sm text-white/70">Status</label>
                  <select
                    id="ticketStatus"
                    value={ticketStatus}
                    onChange={(e) => setTicketStatus(e.target.value as 'All' | 'Open' | 'Closed')}
                    className="bg-white/10 border border-white/20 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-white/30"
                  >
                    <option value="All">All</option>
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                  </select>
                  <div className="text-sm text-white/60">Total: {ticketsTotal}</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2 px-3">ID</th>
                      <th className="text-left py-2 px-3">Subject</th>
                      <th className="text-left py-2 px-3">Description</th>
                      <th className="text-left py-2 px-3">User</th>
                      <th className="text-left py-2 px-3">Phone</th>
                      <th className="text-left py-2 px-3">Status</th>
                      <th className="text-left py-2 px-3">Created</th>
                      <th className="text-left py-2 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center text-white/60 py-6">No tickets</td>
                      </tr>
                    ) : (
                      tickets.map((t) => (
                        <tr key={t.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-2 px-3">{t.id}</td>
                          <td className="py-2 px-3">{t.subject}</td>
                          <td className="py-2 px-3 max-w-[360px] truncate" title={t.message}>{t.message}</td>
                          <td className="py-2 px-3">{t.user?.email || t.user?.name || t.user?.id}</td>
                          <td className="py-2 px-3">{t.user?.phone || '—'}</td>
                          <td className="py-2 px-3">{t.status}</td>
                          <td className="py-2 px-3">{t.createdAt}</td>
                          <td className="py-2 px-3">
                            {String(t.status).toLowerCase() !== 'closed' ? (
                              <button
                                onClick={() => closeTicket(t.id)}
                                disabled={closingTicketId === t.id || loading}
                                className="px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                                title="Mark as Closed"
                              >
                                Close
                              </button>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Maintenance */}
            <section className="bg-white/10 border border-white/20 rounded">
              <div className="p-4 flex items-center justify-between">
                <h2 className="text-lg font-medium">Maintenance</h2>
              </div>
              <div className="p-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={async () => {
                    setMaintLoading(true);
                    setError("");
                    setMaintResult(null);
                    try {
                      const res = await fetch(`/api/admin/maintenance/normalize-phones`, {
                        method: 'POST',
                        headers: authHeaders(),
                        credentials: 'same-origin',
                        cache: 'no-store',
                        body: JSON.stringify({ dryRun: true })
                      });
                      const json = await res.json();
                      if (!res.ok || !json?.success) throw new Error(json?.message || `Failed (${res.status})`);
                      setMaintResult(json);
                    } catch (e: any) {
                      setError(e?.message || 'Dry run failed');
                    } finally {
                      setMaintLoading(false);
                    }
                  }}
                  disabled={maintLoading}
                  className="px-3 py-2 rounded bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                >
                  {maintLoading ? 'Running…' : 'Dry Run: Normalize Phones (+91)'}
                </button>
                <button
                  onClick={async () => {
                    setMaintLoading(true);
                    setError("");
                    try {
                      const res = await fetch(`/api/admin/maintenance/normalize-phones`, {
                        method: 'POST',
                        headers: authHeaders(),
                        credentials: 'same-origin',
                        cache: 'no-store',
                        body: JSON.stringify({ dryRun: false })
                      });
                      const json = await res.json();
                      if (!res.ok || !json?.success) throw new Error(json?.message || `Failed (${res.status})`);
                      setMaintResult(json);
                      // Reload to refresh users list/summary
                      loadAll();
                    } catch (e: any) {
                      setError(e?.message || 'Normalization failed');
                    } finally {
                      setMaintLoading(false);
                    }
                  }}
                  disabled={maintLoading}
                  className="px-3 py-2 rounded bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {maintLoading ? 'Running…' : 'Normalize Phones Now'}
                </button>
                {maintResult && (
                  <div className="text-sm text-white/80">
                    <div>Total Users: {maintResult?.data?.total ?? '—'}</div>
                    <div>To Update: {maintResult?.data?.toUpdate ?? '—'}</div>
                    {typeof maintResult?.dryRun !== 'undefined' && (
                      <div>Dry Run: {String(maintResult.dryRun)}</div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Contact Messages */}
            <section className="bg-white/10 border border-white/20 rounded">
              <div className="p-4 flex items-center justify-between">
                <h2 className="text-lg font-medium">Contact Messages</h2>
                <div className="text-sm text-white/60">Latest 200</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2 px-3">ID</th>
                      <th className="text-left py-2 px-3">Email</th>
                      <th className="text-left py-2 px-3">Phone</th>
                      <th className="text-left py-2 px-3">Message</th>
                      <th className="text-left py-2 px-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contactMessages.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-white/60 py-6">No contact messages</td>
                      </tr>
                    ) : (
                      contactMessages.map((m) => (
                        <tr key={m.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-2 px-3">{m.id}</td>
                          <td className="py-2 px-3">{m.email}</td>
                          <td className="py-2 px-3">+{m.phone}</td>
                          <td className="py-2 px-3 max-w-[480px] truncate" title={m.message}>{m.message}</td>
                          <td className="py-2 px-3">{m.createdAt}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Login Requests */}
            <section className="bg-white/10 border border-white/20 rounded">
              <div className="p-4 flex items-center justify-between">
                <h2 className="text-lg font-medium">Login Requests</h2>
                <div className="text-sm text-white/60">Latest 200</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2 px-3">ID</th>
                      <th className="text-left py-2 px-3">Phone</th>
                      <th className="text-left py-2 px-3">Hash</th>
                      <th className="text-left py-2 px-3">Verified</th>
                      <th className="text-left py-2 px-3">Expires</th>
                      <th className="text-left py-2 px-3">Created</th>
                      <th className="text-left py-2 px-3">Verified At</th>
                      <th className="text-left py-2 px-3">Last Fail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginRequests.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center text-white/60 py-6">No login requests</td>
                      </tr>
                    ) : (
                      loginRequests.map((r) => (
                        <tr key={r.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-2 px-3">{r.id}</td>
                          <td className="py-2 px-3">+{r.phone}</td>
                          <td className="py-2 px-3 max-w-[240px] truncate" title={r.hash}>{r.hash}</td>
                          <td className="py-2 px-3">{r.verified ? 'Yes' : 'No'}</td>
                          <td className="py-2 px-3">{r.expiresAt}</td>
                          <td className="py-2 px-3">{r.createdAt}</td>
                          <td className="py-2 px-3">{r.verifiedAt || '—'}</td>
                          <td className="py-2 px-3">{r.lastFailedReason ? `${r.lastFailedReason} (${r.lastFailedAt || ''})` : '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* OTP Requests */}
            <section className="bg-white/10 border border-white/20 rounded">
              <div className="p-4 flex items-center justify-between">
                <h2 className="text-lg font-medium">OTP Requests</h2>
                <div className="text-sm text-white/60">Latest 200</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2 px-3">ID</th>
                      <th className="text-left py-2 px-3">Phone</th>
                      <th className="text-left py-2 px-3">Type</th>
                      <th className="text-left py-2 px-3">Consumed</th>
                      <th className="text-left py-2 px-3">Expires</th>
                      <th className="text-left py-2 px-3">Created</th>
                      <th className="text-left py-2 px-3">Verified At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otpRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center text-white/60 py-6">No OTP requests</td>
                      </tr>
                    ) : (
                      otpRequests.map((r) => (
                        <tr key={r.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-2 px-3">{r.id}</td>
                          <td className="py-2 px-3">+{r.phone}</td>
                          <td className="py-2 px-3">{r.type}</td>
                          <td className="py-2 px-3">{r.consumed ? 'Yes' : 'No'}</td>
                          <td className="py-2 px-3">{r.expiresAt}</td>
                          <td className="py-2 px-3">{r.createdAt}</td>
                          <td className="py-2 px-3">{r.verifiedAt || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Auth Sessions (JWT) */}
            <section className="bg-white/10 border border-white/20 rounded">
              <div className="p-4 flex items-center justify-between">
                <h2 className="text-lg font-medium">Auth Sessions</h2>
                <div className="text-sm text-white/60">Latest 200</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2 px-3">ID</th>
                      <th className="text-left py-2 px-3">User</th>
                      <th className="text-left py-2 px-3">Auth Method</th>
                      <th className="text-left py-2 px-3">Expires</th>
                      <th className="text-left py-2 px-3">Created</th>
                      <th className="text-left py-2 px-3">Token</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-white/60 py-6">No sessions</td>
                      </tr>
                    ) : (
                      sessions.map((s) => (
                        <tr key={s.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-2 px-3">{s.id}</td>
                          <td className="py-2 px-3">{s.userId}</td>
                          <td className="py-2 px-3">{s.authMethod || '—'}</td>
                          <td className="py-2 px-3">{s.expiresAt}</td>
                          <td className="py-2 px-3">{s.createdAt}</td>
                          <td className="py-2 px-3 max-w-[360px] truncate" title={s.token}>{s.token}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Prisma Sessions (App Activity) */}
            <section className="bg-white/10 border border-white/20 rounded">
              <div className="p-4 flex items-center justify-between">
                <h2 className="text-lg font-medium">App Sessions (Activity)</h2>
                <div className="text-sm text-white/60">Latest 200</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2 px-3">ID</th>
                      <th className="text-left py-2 px-3">User</th>
                      <th className="text-left py-2 px-3">IP</th>
                      <th className="text-left py-2 px-3">User Agent</th>
                      <th className="text-left py-2 px-3">Created</th>
                      <th className="text-left py-2 px-3">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prismaSessions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-white/60 py-6">No app sessions</td>
                      </tr>
                    ) : (
                      prismaSessions.map((s) => (
                        <tr key={s.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-2 px-3">{s.id}</td>
                          <td className="py-2 px-3">{s.userId}</td>
                          <td className="py-2 px-3">{s.ip || '—'}</td>
                          <td className="py-2 px-3 max-w-[360px] truncate" title={s.userAgent || ''}>{s.userAgent || '—'}</td>
                          <td className="py-2 px-3">{s.createdAt}</td>
                          <td className="py-2 px-3">{s.lastSeen}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {error && (
              <div className="bg-red-600/20 border border-red-600/40 rounded p-3 text-red-200">
                <div className="flex items-center justify-between">
                  <span>{error}</span>
                  <a href="/api/auth/signin" className="underline">Sign in</a>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
