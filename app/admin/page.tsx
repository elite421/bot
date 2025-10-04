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

type ApiResponse<T> = { success: boolean; data: T; message?: string };

export default function AdminPage() {
  const router = useRouter();

  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [authLogs, setAuthLogs] = useState<AdminAuthLog[]>([]); // will hold transactions now
  const [usageLogs, setUsageLogs] = useState<AdminAuthLog[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsTotal, setTicketsTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [query, setQuery] = useState("");
  const [roleSavingId, setRoleSavingId] = useState<number | null>(null);
  const [blockSavingId, setBlockSavingId] = useState<number | null>(null);
  const [closingTicketId, setClosingTicketId] = useState<number | null>(null);
  const [ticketStatus, setTicketStatus] = useState<'All' | 'Open' | 'Closed'>('All');

  const authHeaders = (): HeadersInit => ({
    "Content-Type": "application/json"
  });

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const ticketsUrl = `/api/admin/tickets${ticketStatus && ticketStatus !== 'All' ? `?status=${encodeURIComponent(ticketStatus)}` : ''}`;
      const [sRes, uRes, lRes, ulRes, tRes] = await Promise.all([
        fetch(`/api/admin/summary`, { headers: authHeaders(), credentials: 'same-origin', cache: 'no-store' }),
        fetch(`/api/admin/users${query ? `?q=${encodeURIComponent(query)}` : ""}`, { headers: authHeaders(), credentials: 'same-origin', cache: 'no-store' }),
        fetch(`/api/admin/transactions`, { headers: authHeaders(), credentials: 'same-origin', cache: 'no-store' }),
        fetch(`/api/admin/usage-logs`, { headers: authHeaders(), credentials: 'same-origin', cache: 'no-store' }),
        fetch(ticketsUrl, { headers: authHeaders(), credentials: 'same-origin', cache: 'no-store' }),
      ]);

      // Handle 401/403 explicitly
      if (sRes.status === 401 || uRes.status === 401 || lRes.status === 401 || ulRes.status === 401 || tRes.status === 401) {
        setError("Unauthorized. Please sign in.");
        router.replace('/admin-login');
        return;
      }
      if (sRes.status === 403 || uRes.status === 403 || lRes.status === 403 || ulRes.status === 403 || tRes.status === 403) {
        setError("Forbidden. Your account does not have admin access.");
        router.replace('/admin-login');
        return;
      }

      if (!sRes.ok) throw new Error(`Summary failed (${sRes.status})`);
      if (!uRes.ok) throw new Error(`Users failed (${uRes.status})`);
      if (!lRes.ok) throw new Error(`Transactions failed (${lRes.status})`);
      if (!ulRes.ok) throw new Error(`Usage logs failed (${ulRes.status})`);
      if (!tRes.ok) throw new Error(`Tickets failed (${tRes.status})`);

      const sJson: ApiResponse<AdminSummary> = await sRes.json();
      const uJson: ApiResponse<AdminUser[]> = await uRes.json();
      const lJson: ApiResponse<any> = await lRes.json();
      const ulJson: ApiResponse<AdminAuthLog[]> = await ulRes.json();
      const tJson: ApiResponse<{ tickets: SupportTicket[]; totalCount: number; byStatus: { status: string; _count: { _all: number } }[] }>
        = await tRes.json();
      if (!sJson.success) throw new Error(sJson.message || "Summary error");
      if (!uJson.success) throw new Error(uJson.message || "Users error");
      if (!lJson.success) throw new Error(lJson.message || "Transactions error");
      if (!ulJson.success) throw new Error(ulJson.message || "Usage logs error");
      if (!tJson.success) throw new Error(tJson.message || "Tickets error");
      setSummary(sJson.data);
      setUsers(uJson.data);
      setAuthLogs(lJson.data);
      setUsageLogs(ulJson.data);
      setTickets(tJson.data.tickets);
      setTicketsTotal(tJson.data.totalCount);
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
