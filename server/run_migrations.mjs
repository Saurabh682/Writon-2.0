import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const DATABASE_URL = 'postgresql://testuser:testpass@localhost:5433/testdb';

async function migrate() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  
  try {
    const bootstrapDir = path.resolve('staging/bootstrap');
    const bootstrapFiles = (await fs.readdir(bootstrapDir)).filter(f => f.endsWith('.sql')).sort();
    for (const file of bootstrapFiles) {
      console.log(`Applying bootstrap ${file}...`);
      const sql = await fs.readFile(path.join(bootstrapDir, file), 'utf8');
      await client.query(sql);
    }
    
    const migrationsDir = path.resolve('migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
    
    for (const file of sqlFiles) {
      console.log(`Applying ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf8');
      
      try {
        await client.query(sql);
      } catch (err) {
        console.error(`Error in ${file}:`, err.message);
        // Continue applying or halt? Let's halt on error.
        throw err;
      }
    }
    console.log('Migrations applied successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
