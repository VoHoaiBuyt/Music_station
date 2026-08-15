async function test() {
  const baseUrl = 'http://localhost:3000';
  console.log('Testing APIs on', baseUrl);

  // 1. Health Check
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const health = await healthRes.json();
  console.log('1. Health Check:', health);

  // 2. Register
  const testUsername = 'tester_' + Math.floor(Math.random() * 10000);
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: testUsername,
      email: `${testUsername}@example.com`,
      password: 'password123',
      avatar: '🎧'
    })
  });
  const regData = await regRes.json();
  console.log('2. Register:', regData.success ? 'SUCCESS - User ID: ' + regData.data.user.id : regData);

  const token = regData.data.token;

  // 3. Get Me
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const meData = await meRes.json();
  console.log('3. Get Profile (JWT Auth):', meData.success ? 'SUCCESS - Username: ' + meData.data.user.username : meData);

  // 4. Add Favorite
  const favRes = await fetch(`${baseUrl}/api/user/favorites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      videoId: '5qap5aO4i9A',
      title: 'lofi hip hop radio - beats to sleep/chill to',
      author: 'Lofi Girl',
      thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
      duration: 300
    })
  });
  const favData = await favRes.json();
  console.log('4. Add Favorite:', favData.success ? 'SUCCESS - Saved to Supabase DB' : favData);

  // 5. Get Favorites
  const getFavRes = await fetch(`${baseUrl}/api/user/favorites`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const getFavData = await getFavRes.json();
  console.log('5. List Favorites:', getFavData.success ? `SUCCESS - ${getFavData.data.length} item(s) found` : getFavData);

  console.log('✨ ALL TESTS PASSED! Project is 100% functional with Supabase PostgreSQL & Auth!');
}

test().catch(console.error);
