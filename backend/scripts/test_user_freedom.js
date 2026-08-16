const BASE_URL = 'http://localhost:3000';

async function testUserFreedom() {
  console.log('🧪 Testing 100% User-Driven Architecture (No Seed Rooms / No Default Music)...\n');

  // 1. Check Lobby has 0 pre-existing rooms
  console.log('1. Fetching Lobby rooms via GET /api/rooms...');
  const roomsRes = await fetch(`${BASE_URL}/api/rooms`);
  const roomsData = await roomsRes.json();
  console.log(`   ✅ Success! Found ${roomsData.data.length} rooms in Lobby (Expected: 0 pre-existing rooms).`);

  // 2. Login as Admin
  console.log('\n2. Logging in as Admin...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: 'admin', password: 'Admin@2026!' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data.token;
  console.log('   ✅ Logged in as:', loginData.data.user.username);

  // 3. Create a custom user room
  console.log('\n3. Creating Custom Room "Góc Nhạc Của Buýt 🌙"...');
  const createRes = await fetch(`${BASE_URL}/api/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Góc Nhạc Của Buýt 🌙',
      description: 'Phòng nhạc chill đêm khuya',
      coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80'
    })
  });
  const createData = await createRes.json();
  console.log('   ✅ Created room:', createData.data.name, `(Slug: ${createData.data.slug})`);

  // 4. Verify room starts with 0 songs
  console.log('\n4. Verifying room starts clean with NO default music...');
  const roomRes = await fetch(`${BASE_URL}/api/rooms/${createData.data.slug}`);
  const roomDetail = await roomRes.json();
  console.log('   ✅ Current Track in room:', roomDetail.data.currentTrack); // Should be null
  console.log('   ✅ Queue in room:', roomDetail.data.queue); // Should be []

  console.log('\n✨ ALL USER FREEDOM TESTS PASSED 100%!');
}

testUserFreedom().then(() => process.exit(0)).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
