import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import path from 'path';
import dotenv from 'dotenv';

// Ensure DATABASE_URL is available at runtime. In dev, Next.js reads from .env.local,
// but tools may expect prisma/.env. Fallback to prisma/.env if missing and not on Vercel.
const IS_VERCEL = !!process.env.VERCEL;
if (!process.env.DATABASE_URL && !IS_VERCEL) {
  try {
    dotenv.config({ path: path.join(process.cwd(), 'prisma/.env') });
  } catch {
    // ignore
  }
}

// Create a singleton Postgres pool. In dev, reuse across HMR reloads.
const connectionString = process.env.DATABASE_URL;
if (!connectionString && process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.warn('[db] DATABASE_URL is not set. The pool will fail if used before you configure it.');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalAny = global as any;

const parsedUrl = (() => {
  try { return connectionString ? new URL(connectionString) : null; } catch { return null; }
})();
const isRailwayHost = parsedUrl?.hostname ? /rlwy\.net|railway/i.test(parsedUrl.hostname) : false;
const isDev = process.env.NODE_ENV !== 'production';
const sslRequired = isDev || /sslmode=require/i.test(connectionString || '') || isRailwayHost;
const POOL_KEY = `${connectionString}|ssl=${sslRequired ? '1' : '0'}`;

// In development, ensure all TLS checks are bypassed to avoid self-signed cert chain errors.
if (isDev && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Minimal debug to verify DB connection mode (no secrets)
try {
  // eslint-disable-next-line no-console
  console.log(`[db] host=${parsedUrl?.hostname || 'unknown'} ssl=${sslRequired} env=${process.env.NODE_ENV}`);
} catch {}

export const pool: Pool =
  (globalAny.__PG_POOL__ && globalAny.__PG_POOL_KEY === POOL_KEY)
    ? globalAny.__PG_POOL__
    : new Pool({
        connectionString,
        // In development, always bypass certificate verification to avoid local TLS issues.
        ssl: sslRequired ? { rejectUnauthorized: false } : undefined,
      });

if (process.env.NODE_ENV !== 'production') {
  globalAny.__PG_POOL__ = pool;
  globalAny.__PG_POOL_KEY = POOL_KEY;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
  return pool.query<T>(text, params as any[] | undefined);
}

export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export const db = { pool, query, tx };
