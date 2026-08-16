const db = require('../config/db');

async function cleanUsers() {
  console.log('⚡ Deleting all test users except Admin in Supabase PostgreSQL...');
  
  try {
    const deleteRes = await db.query(
      `DELETE FROM music_station_db.users WHERE role != 'ADMIN' AND username != 'admin' RETURNING id, username, email;`
    );
    console.log(`✅ Successfully deleted ${deleteRes.rowCount} non-admin user(s):`);
    deleteRes.rows.forEach(u => console.log(`   - Deleted: ${u.username} (${u.email})`));

    const remaining = await db.query(`SELECT id, username, email, role, avatar, level FROM music_station_db.users;`);
    console.log('\n👑 Remaining Admin accounts in Supabase DB:');
    console.table(remaining.rows);
  } catch (err) {
    console.error('❌ Error cleaning users:', err.message);
  }
}

cleanUsers().then(() => process.exit(0)).catch(console.error);
