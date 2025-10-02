// Debug script to check localStorage contents
// Run this in browser console to see what's stored

console.log('=== LOCALSTORAGE DEBUG ===');

// Check all localStorage keys
const allKeys = Object.keys(localStorage);
console.log('All localStorage keys:', allKeys);

// Check for auth-related keys
const authKeys = allKeys.filter(key => 
  key.includes('mayhem') || 
  key.includes('auth') || 
  key.includes('user') || 
  key.includes('session')
);
console.log('Auth-related keys:', authKeys);

// Check each auth-related key
authKeys.forEach(key => {
  try {
    const value = localStorage.getItem(key);
    console.log(`Key: ${key}`);
    console.log('Raw value:', value);
    if (value) {
      try {
        const parsed = JSON.parse(value);
        console.log('Parsed value:', parsed);
      } catch (e) {
        console.log('Could not parse as JSON:', e.message);
      }
    }
    console.log('---');
  } catch (e) {
    console.log(`Error reading key ${key}:`, e.message);
  }
});

// Check specifically for mayhem_auth key
console.log('=== CHECKING mayhem_auth KEY ===');
const mayhemAuth = localStorage.getItem('mayhem_auth');
console.log('mayhem_auth raw:', mayhemAuth);
if (mayhemAuth) {
  try {
    const parsed = JSON.parse(mayhemAuth);
    console.log('mayhem_auth parsed:', parsed);
    console.log('User:', parsed.user);
    console.log('Session:', parsed.session);
  } catch (e) {
    console.log('Error parsing mayhem_auth:', e.message);
  }
} else {
  console.log('No mayhem_auth key found');
}

// Check if there are any other auth storage patterns
console.log('=== CHECKING FOR OTHER AUTH PATTERNS ===');
const possibleKeys = [
  'auth',
  'user',
  'session',
  'token',
  'authData',
  'userData',
  'sessionData',
  'mayhem_user',
  'mayhem_session',
  'mayhem_token'
];

possibleKeys.forEach(key => {
  const value = localStorage.getItem(key);
  if (value) {
    console.log(`Found key: ${key}`, value);
  }
});

console.log('=== END DEBUG ===');
