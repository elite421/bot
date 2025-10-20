import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

const NEXTAUTH_DEBUG_ENABLED = process.env.NEXTAUTH_DEBUG === 'true';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  jwt: { maxAge: 30 * 24 * 60 * 60 },
  debug: NEXTAUTH_DEBUG_ENABLED,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).trim().toLowerCase();
        // Lazy-load DB to avoid initializing a pool during layout render when
        // DATABASE_URL may be missing in environments that only perform session checks.
        const { query } = await import('./db');

        // Case-insensitive lookup to reduce user input mismatches
        const { rows } = await query<{
          id: number;
          email: string | null;
          name: string | null;
          role: string;
          password: string | null;
          is_blocked: boolean;
        }>(
          `SELECT id, email, name, role, password, is_blocked
           FROM users
           WHERE email IS NOT NULL AND lower(email) = lower($1)
           LIMIT 1`,
          [email]
        );
        const user = rows[0];

        if (!user) {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.warn('[auth] Credentials sign-in: user not found for', email);
          }
          return null;
        }

        // Blocked users cannot sign in
        if ((user as any).is_blocked) {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.warn('[auth] Credentials sign-in: user is blocked', email);
          }
          return null;
        }

        const stored = (user as any).password as string | null;
        if (!stored) {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.warn('[auth] Credentials sign-in: no password set for', email);
          }
          return null;
        }

        let ok = false;
        try {
          if (stored.startsWith('$2')) {
            // Bcrypt hash
            ok = await bcrypt.compare(String(credentials.password), stored);
          } else {
            // Legacy plaintext password (auto-migrate on first successful login)
            ok = stored === String(credentials.password);
            if (ok) {
              try {
                const hash = await bcrypt.hash(String(credentials.password), 10);
                await query('UPDATE users SET password = $1 WHERE id = $2', [hash, (user as any).id]);
              } catch {
                // best-effort upgrade; ignore failures
              }
            }
          }
        } catch {
          ok = false;
        }

        if (!ok) {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.warn('[auth] Credentials sign-in: invalid password for', email);
          }
          return null;
        }

        return {
          id: String((user as any).id),
          email: (user as any).email,
          name: (user as any).name,
          role: (user as any).role,
          totalAuthCredits: 0,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.uid = (user as any).id;
        token.role = (user as any).role || 'user';
        token.totalAuthCredits = (user as any).totalAuthCredits ?? 0;
      }
      if (trigger === 'update' && session) {
        token.totalAuthCredits = (session as any).totalAuthCredits ?? token.totalAuthCredits;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid;
        (session.user as any).role = token.role || 'user';
        (session.user as any).totalAuthCredits = token.totalAuthCredits ?? 0;
      }
      return session;
    },
  },
  pages: {
    signIn: '/admin-login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
