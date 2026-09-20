import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure server/.env and root .env are loaded regardless of current working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

export const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false },
  max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
});
