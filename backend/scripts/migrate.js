const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function migrate() {
  console.log('Connecting to Supabase PostgreSQL...');
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase successfully!');

    const sqlPath = path.join(__dirname, '..', 'prisma', 'init_supabase.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing schema initialization in schema: music_station_db...');
    await client.query(sql);

    console.log('All tables created successfully in Supabase schema: music_station_db!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
