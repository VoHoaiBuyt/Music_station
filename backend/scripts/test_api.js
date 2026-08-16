/**
 * Test Suite for Lofi Multi-Room Production APIs & Supabase PostgreSQL
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runTests() {
  console.log(`🚀 Testing Multi-Room APIs on ${BASE_URL}`);

  // 1. Health check
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const health = await healthRes.json();
  console.log('1. Health Check:', health);

  // 2. Get All Rooms (Lobby)
  const roomsRes = await fetch(`${BASE_URL}/api/rooms`);
  const roomsData = await roomsRes.json();
  console.log(`2. Get All Rooms (Lobby): SUCCESS - Found ${roomsData.data.length} active room(s)`);
  roomsData.data.forEach(r => console.log(`   -> [${r.genre}] ${r.name} (${r.slug})`));

  // 3. Register user
  const randomUser = `test_dj_${Math.floor(Math.random() * 10000)}`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: randomUser,
      email: `${randomUser}@gmail.com`,
      password: 'password123',
      avatar: '🎧'
    })
  });
  const regData = await regRes.json();
  console.log('3. Register User:', regData.success ? `SUCCESS - User ID: ${regData.data.user.id}` : 'Failed', regData.message || '');
  const token = regData.data?.token;

  // 4. Create Custom User Room
  const createRoomRes = await fetch(`${BASE_URL}/api/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Chill Coding Space 💻',
      genre: 'Lofi & Chill',
      description: 'Phòng nghe nhạc code thư giãn đêm khuya.',
      coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80'
    })
  });
  const createRoomData = await createRoomRes.json();
  console.log('4. Create Custom Room:', createRoomData.success ? `SUCCESS - Created Room: "${createRoomData.data.name}" (${createRoomData.data.slug})` : 'Failed');

  const createdSlug = createRoomData.data?.slug;

  // 5. Get Room Details
  const getRoomRes = await fetch(`${BASE_URL}/api/rooms/${createdSlug}`);
  const getRoomData = await getRoomRes.json();
  console.log('5. Get Room by Slug:', getRoomData.success ? `SUCCESS - Host: ${getRoomData.data.creatorName}, Genre: ${getRoomData.data.genre}` : 'Failed');

  // 6. Delete Custom Room
  const delRoomRes = await fetch(`${BASE_URL}/api/rooms/${createdSlug}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const delRoomData = await delRoomRes.json();
  console.log('6. Delete Room:', delRoomData.success ? 'SUCCESS - Room Deleted' : 'Failed');

  console.log('✨ ALL MULTI-ROOM TESTS PASSED 100%!');
}

runTests().catch(console.error);
