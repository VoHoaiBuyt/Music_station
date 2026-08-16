const db = require('../config/db');

async function removeAllDefaultRooms() {
  console.log('⚡ Removing all pre-existing / default rooms from Supabase PostgreSQL...');
  try {
    const res = await db.query(
      `DELETE FROM music_station_db.rooms WHERE "isDefault" = true OR "creatorName" = 'Station Master' RETURNING id, name, slug;`
    );
    console.log(`✅ Deleted ${res.rowCount} pre-existing room(s):`);
    res.rows.forEach(r => console.log(`   - Deleted: ${r.name} (${r.slug})`));

    const remaining = await db.query(`SELECT id, name, slug, "creatorName" FROM music_station_db.rooms;`);
    console.log('\n🏠 Remaining User-Created Rooms in DB:');
    console.table(remaining.rows);
  } catch (err) {
    console.error('❌ Error removing default rooms:', err.message);
  }
}

removeAllDefaultRooms().then(() => process.exit(0)).catch(console.error);
