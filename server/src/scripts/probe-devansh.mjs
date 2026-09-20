import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const r = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='profiles' ORDER BY ordinal_position");
console.log(r.rows.map(x => x.column_name).join(', '));
// Also find devansh profile
const d = await pool.query("SELECT id, pen_name FROM public.profiles WHERE pen_name ILIKE '%devansh%' LIMIT 5");
console.log('Devansh profiles:', JSON.stringify(d.rows));
await pool.end();
