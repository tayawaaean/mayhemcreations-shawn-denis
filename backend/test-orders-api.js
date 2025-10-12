// Test the orders API endpoint to see the exact error
const fetch = require('node-fetch');

async function testOrdersAPI() {
  try {
    // You'll need to get a valid admin token
    // For now, let's test without auth to see the error
    const response = await fetch('http://localhost:5001/api/v1/admin/orders?limit=100', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add your admin token here if you have one
        // 'Authorization': 'Bearer YOUR_TOKEN'
      }
    });

    const data = await response.json();
    
    console.log('\n📡 API Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      console.log('\n❌ Error Response');
    } else {
      console.log('\n✅ Success Response');
      if (data.data && data.data.orders) {
        console.log(`\n📊 Found ${data.data.orders.length} order(s)`);
      }
    }
  } catch (error) {
    console.error('\n💥 Request failed:', error.message);
  }
}

testOrdersAPI();


