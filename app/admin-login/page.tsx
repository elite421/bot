"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (!res || res.error) {
        setError(res?.error || 'Invalid credentials');
        return;
      }

      // Best-effort login tracking
      try { await fetch('/api/track-login', { method: 'POST', credentials: 'same-origin' }); } catch {}

      router.replace('/admin');
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/10 border border-white/20 rounded p-6">
        <h1 className="text-2xl font-semibold mb-4">Admin Sign In</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/80 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 outline-none focus:ring-2 focus:ring-white/30"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-white/80 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 outline-none focus:ring-2 focus:ring-white/30"
              required
            />
          </div>
          {error && (
            <div className="bg-red-600/20 border border-red-600/40 rounded p-3 text-red-200 text-sm">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className="mt-4 text-xs text-white/60">
          Use the seeded admin user or your credentials. After sign in you will be redirected to the Admin Dashboard.
        </p>
      </div>
    </div>
  );
}
