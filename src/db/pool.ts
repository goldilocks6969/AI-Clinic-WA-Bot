import { Pool, type QueryResultRow } from 'pg';
import { requireConfig } from '../config.js';

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: requireConfig('DATABASE_URL'),
      // Keep small: serverless concurrency * max must stay under the DB's limit.
      // Front your Postgres with PgBouncer in production (see plan).
      max: Number(process.env.PG_POOL_MAX ?? 5),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const res = await getPool().query<T>(text, params as unknown[]);
  return res.rows;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
