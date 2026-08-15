const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

async function seedAdmin() {
  console.log('⚡ Creating / Updating Super Admin user on Supabase PostgreSQL...');
  
  const password = process.env.ADMIN_PASSWORD || 'Admin@2026!';
  const passwordHash = await bcrypt.hash(password, 10);

  const query = `
    INSERT INTO music_station_db.users (username, email, "passwordHash", avatar, role, level, xp)
    VALUES ('admin', 'admin@lofilounge.com', $1, '👑', 'ADMIN', 99, 9999)
    ON CONFLICT (email) 
    DO UPDATE SET 
      "passwordHash" = EXCLUDED."passwordHash", 
      role = 'ADMIN', 
      avatar = '👑', 
      level = 99
    RETURNING id, username, email, role, avatar, level;
  `;

  try {
    const res = await db.query(query, [passwordHash]);
    console.log('✅ Super Admin account is ready on Supabase:', res.rows[0]);
    console.log('----------------------------------------------------');
    console.log('🔑 ADMIN LOGIN CREDENTIALS:');
    console.log('   Username / Email : admin (hoặc admin@lofilounge.com)');
    console.log('   Password         :', password);
    console.log('   Role             : ADMIN (Toàn quyền quản trị)');
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('❌ Error seeding admin:', err.message);
  }
}

seedAdmin().then(() => process.exit(0)).catch(console.error);
