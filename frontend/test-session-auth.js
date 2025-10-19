// Test script to verify session-based authentication is working
// Run this in the browser console after logging in

console.log('🧪 Testing session-based authentication...');

// Test 1: Check if sessionId is stored in localStorage
const multiAuth = localStorage.getItem('mayhem_multi_auth');
if (multiAuth) {
  const authData = JSON.parse(multiAuth);
  console.log('✅ Multi-account auth data found:', {
    currentAccount: authData.currentAccount,
    hasSessionId: !!authData[authData.currentAccount]?.session?.sessionId,
    sessionId: authData[authData.currentAccount]?.session?.sessionId
  });
} else {
  console.log('❌ No multi-account auth data found');
}

// Test 2: Test API call with session-based auth
async function testApiCall() {
  try {
    console.log('🧪 Testing API call to /api/v1/cart...');
    
    const response = await fetch('http://localhost:5001/api/v1/cart', {
      method: 'GET',
      credentials: 'include', // Include cookies for session-based auth
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📡 API Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API call successful:', data);
    } else {
      const errorData = await response.json();
      console.log('❌ API call failed:', errorData);
    }
  } catch (error) {
    console.error('❌ API call error:', error);
  }
}

// Test 3: Check if cookies are being sent
function checkCookies() {
  console.log('🍪 Current cookies:', document.cookie);
  
  // Check if session cookie exists
  const hasSessionCookie = document.cookie.includes('connect.sid') || document.cookie.includes('session');
  console.log('✅ Session cookie present:', hasSessionCookie);
}

// Run tests
checkCookies();
testApiCall();

console.log('🧪 Session-based auth test completed. Check the results above.');
