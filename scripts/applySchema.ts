import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getPool, closePool } from '../src/db/pool.js';

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(here, '..', 'db', 'reference_schema.sql'), 'utf8');

const pool = getPool();
await pool.query(sql);
// eslint-disable-next-line no-console
console.log('✓ Applied db/reference_schema.sql');
await closePool();
