// Test script to debug trends API
// Run with: npx tsx test-trends-api.ts

async function testTrendsAPI() {
  const baseUrl = 'http://localhost:3000'
  
  console.log('Testing Instagram Trends API...\n')
  
  // Test 1: GET trends (should require auth)
  console.log('1. Testing GET /api/trends/instagram')
  try {
    const getResponse = await fetch(`${baseUrl}/api/trends/instagram`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        // Add your cookie here if testing locally
        // 'Cookie': 'user_id=YOUR_USER_ID'
      }
    })
    
    console.log('   Status:', getResponse.status)
    const getData = await getResponse.json()
    console.log('   Response:', JSON.stringify(getData, null, 2))
  } catch (error) {
    console.log('   Error:', error)
  }
  
  console.log('\n2. Testing POST /api/trends/instagram')
  try {
    const postResponse = await fetch(`${baseUrl}/api/trends/instagram`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        // Add your cookie here if testing locally
        // 'Cookie': 'user_id=YOUR_USER_ID'
      },
      body: JSON.stringify({
        hashtags: ['test', 'lifestyle'],
        maxPostsPerTag: 10,
        analysisType: 'quick'
      })
    })
    
    console.log('   Status:', postResponse.status)
    const postData = await postResponse.json()
    console.log('   Response:', JSON.stringify(postData, null, 2))
  } catch (error) {
    console.log('   Error:', error)
  }
}

// Instructions
console.log('='.repeat(50))
console.log('TREND API TEST SCRIPT')
console.log('='.repeat(50))
console.log('\nTo test with authentication:')
console.log('1. Log into the app at http://localhost:3000/auth/login')
console.log('2. Open browser DevTools (F12) -> Application -> Cookies')
console.log('3. Find the "user_id" cookie value')
console.log('4. Add it to the Cookie header in this script')
console.log('5. Run: npx tsx test-trends-api.ts\n')
console.log('='.repeat(50))
console.log('\nRunning tests without auth (will likely fail):\n')

testTrendsAPI()