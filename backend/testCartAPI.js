const axios = require('axios');

async function testCartAPI() {
  try {
    console.log('🧪 Testing Cart API...');
    
    // Test 1: Check if backend is running
    console.log('\n1️⃣ Testing backend connection...');
    try {
      const healthResponse = await axios.get('http://localhost:5001/api/v1/products');
      console.log('✅ Backend is running:', healthResponse.data);
    } catch (error) {
      console.log('❌ Backend is not running or health endpoint failed:', error.message);
      return;
    }
    
    // Test 2: Test cart endpoint without authentication
    console.log('\n2️⃣ Testing cart endpoint without authentication...');
    try {
      const cartResponse = await axios.get('http://localhost:5001/api/v1/cart');
      console.log('❌ Cart endpoint should require authentication but succeeded:', cartResponse.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Cart endpoint properly requires authentication (401)');
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }
    
    // Test 3: Test adding to cart without authentication
    console.log('\n3️⃣ Testing add to cart without authentication...');
    try {
      const addResponse = await axios.post('http://localhost:5001/api/v1/cart', {
        productId: '1',
        quantity: 1,
        customization: { test: 'data' }
      });
      console.log('❌ Add to cart should require authentication but succeeded:', addResponse.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Add to cart properly requires authentication (401)');
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }
    
    // Test 4: Check if there are any active sessions
    console.log('\n4️⃣ Checking database for active sessions...');
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '123password',
      database: 'mayhem_creation'
    });
    
    const [sessions] = await connection.execute(`
      SELECT s.id, s.user_id, s.expires_at, s.created_at, u.email, u.role
      FROM sessions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.expires_at > NOW()
      ORDER BY s.created_at DESC
      LIMIT 5
    `);
    
    console.log(`📊 Found ${sessions.length} active sessions:`);
    sessions.forEach((session, index) => {
      console.log(`  ${index + 1}. Session: ${session.id}, User: ${session.user_id} (${session.email}), Role: ${session.role}`);
      console.log(`     Expires: ${session.expires_at}, Created: ${session.created_at}`);
    });
    
    if (sessions.length === 0) {
      console.log('⚠️  No active sessions found - user needs to log in');
    }
    
    await connection.end();
    
    console.log('\n✅ API testing completed');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testCartAPI();
