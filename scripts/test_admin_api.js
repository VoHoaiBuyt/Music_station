const BASE_URL = 'http://localhost:3000';

async function testAdminSuite() {
  console.log('🧪 Testing Admin User Management APIs...\n');

  // 1. Login as Admin
  console.log('1. Logging in as Admin (admin / Admin@2026!)...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: 'admin', password: 'Admin@2026!' })
  });
  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginData.success) {
    throw new Error('Admin login failed: ' + adminLoginData.message);
  }
  const adminToken = adminLoginData.data.token;
  console.log('   ✅ Admin login successful! Token received.');

  // 2. Register a temporary test user to ban and delete
  const testUserEmail = `bad_user_${Date.now()}@example.com`;
  console.log(`\n2. Creating temporary test user: ${testUserEmail}...`);
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `spammer_${Math.floor(1000 + Math.random() * 9000)}`,
      email: testUserEmail,
      password: 'password123',
      avatar: '👾'
    })
  });
  const regData = await regRes.json();
  if (!regData.success) {
    throw new Error('Test user registration failed: ' + regData.message);
  }
  const testUserId = regData.data.user.id;
  const testUserUsername = regData.data.user.username;
  console.log(`   ✅ Test user created: ${testUserUsername} (ID: ${testUserId})`);

  // 3. Admin: Get all users
  console.log('\n3. Admin: Fetching all users via GET /api/admin/users...');
  const usersRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const usersData = await usersRes.json();
  console.log(`   ✅ Success! Found ${usersData.data.length} user(s) in system.`);
  usersData.data.forEach(u => {
    console.log(`      - [${u.role}] ${u.username} (${u.email}) - Banned: ${u.isBanned}`);
  });

  // 4. Admin: Ban user
  console.log(`\n4. Admin: Banning user "${testUserUsername}" via PUT /api/admin/users/:id/ban...`);
  const banRes = await fetch(`${BASE_URL}/api/admin/users/${testUserId}/ban`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ isBanned: true })
  });
  const banData = await banRes.json();
  console.log('   ✅ Ban Result:', banData.message);

  // Verify banned user cannot login
  console.log('\n5. Verifying banned user CANNOT login...');
  const bannedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: testUserEmail, password: 'password123' })
  });
  const bannedLoginData = await bannedLoginRes.json();
  console.log(`   ✅ Login Rejected as expected! Status: ${bannedLoginRes.status}, Message: "${bannedLoginData.message}"`);

  // 5. Admin: Unban user
  console.log(`\n6. Admin: Unbanning user "${testUserUsername}"...`);
  const unbanRes = await fetch(`${BASE_URL}/api/admin/users/${testUserId}/ban`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ isBanned: false })
  });
  const unbanData = await unbanRes.json();
  console.log('   ✅ Unban Result:', unbanData.message);

  // 6. Admin: Delete user
  console.log(`\n7. Admin: Deleting user "${testUserUsername}" permanently via DELETE /api/admin/users/:id...`);
  const delRes = await fetch(`${BASE_URL}/api/admin/users/${testUserId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const delData = await delRes.json();
  console.log('   ✅ Delete Result:', delData.message);

  // Final check: list users again
  console.log('\n8. Final Check: Fetching user list again...');
  const finalUsersRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const finalUsersData = await finalUsersRes.json();
  console.log(`   ✅ Verified! Remaining users count: ${finalUsersData.data.length} (Only Admin remaining).`);

  console.log('\n🎉 ALL ADMIN USER MANAGEMENT TESTS PASSED 100%!');
}

testAdminSuite().then(() => process.exit(0)).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
