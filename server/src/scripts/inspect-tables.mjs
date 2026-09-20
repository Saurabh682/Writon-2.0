import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const res = await pool.query("select column_name, data_type from information_schema.columns where table_name = 'editorial_failure_patterns'");
console.log('editorial_failure_patterns columns:', res.rows);

const res2 = await pool.query("select column_name, data_type from information_schema.columns where table_name = 'editorial_narrative_fingerprints'");
console.log('editorial_narrative_fingerprints columns:', res2.rows);

await pool.end();
