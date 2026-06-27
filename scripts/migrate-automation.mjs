import pg from 'pg';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  
  try {
    const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', '003_days_of_week.sql'), 'utf-8');
    const statements = migration.split(';').filter(s => s.trim().length > 0);
    
    for (const stmt of statements) {
      console.log(`Executing: ${stmt.trim().substring(0, 50)}...`);
      await client.query(stmt + ';');
    }
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
