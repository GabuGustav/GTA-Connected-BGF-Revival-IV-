// Test script for Netlify API endpoints
// Run this to verify your APIs are working after deployment

const BASE_URL = 'https://your-netlify-site.netlify.app'; // Replace with your actual Netlify URL

async function testAPIs() {
    console.log('=== Testing Netlify API Endpoints ===\n');
    
    // Test 1: Health Check
    console.log('1. Testing Health Endpoint...');
    try {
        const response = await fetch(`${BASE_URL}/.netlify/functions/health`);
        const data = await response.json();
        console.log('   Status:', response.status);
        console.log('   Response:', data);
        console.log('   CORS Headers:', response.headers.get('Access-Control-Allow-Origin'));
    } catch (error) {
        console.log('   Error:', error.message);
    }
    console.log('');
    
    // Test 2: Leaderboard API
    console.log('2. Testing Leaderboard Endpoint...');
    try {
        const response = await fetch(`${BASE_URL}/.netlify/functions/leaderboard/police`);
        const data = await response.json();
        console.log('   Status:', response.status);
        console.log('   Response:', data);
        console.log('   CORS Headers:', response.headers.get('Access-Control-Allow-Origin'));
    } catch (error) {
        console.log('   Error:', error.message);
    }
    console.log('');
    
    // Test 3: Profile API
    console.log('3. Testing Profile Endpoint...');
    try {
        const response = await fetch(`${BASE_URL}/.netlify/functions/profile/admin`);
        const data = await response.json();
        console.log('   Status:', response.status);
        console.log('   Response:', data);
        console.log('   CORS Headers:', response.headers.get('Access-Control-Allow-Origin'));
    } catch (error) {
        console.log('   Error:', error.message);
    }
    console.log('');
    
    // Test 4: Send Email API (CORS preflight)
    console.log('4. Testing Send Email CORS Preflight...');
    try {
        const response = await fetch(`${BASE_URL}/.netlify/functions/send-email`, {
            method: 'OPTIONS',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:3000'
            }
        });
        console.log('   Status:', response.status);
        console.log('   CORS Headers:', response.headers.get('Access-Control-Allow-Origin'));
        console.log('   Allowed Methods:', response.headers.get('Access-Control-Allow-Methods'));
    } catch (error) {
        console.log('   Error:', error.message);
    }
    console.log('');
    
    // Test 5: Send Email API (Actual request)
    console.log('5. Testing Send Email Actual Request...');
    try {
        const response = await fetch(`${BASE_URL}/.netlify/functions/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:3000'
            },
            body: JSON.stringify({
                to: 'testuser@bgf.connected',
                subject: 'Test Message',
                message: 'This is a test message from the API testing script.',
                from: 'admin'
            })
        });
        const data = await response.json();
        console.log('   Status:', response.status);
        console.log('   Response:', data);
        console.log('   CORS Headers:', response.headers.get('Access-Control-Allow-Origin'));
    } catch (error) {
        console.log('   Error:', error.message);
    }
    console.log('');
    
    console.log('=== API Testing Complete ===');
    console.log('\nIf all tests pass, your OptiLink host blocking issues should be resolved!');
    console.log('If you see CORS errors, the headers may need further adjustment.');
}

// Instructions for running this test
console.log('To run this test:');
console.log('1. Replace BASE_URL with your actual Netlify site URL');
console.log('2. Run: node test-netlify-apis.js');
console.log('3. Check the results for any CORS or connectivity issues\n');

// Uncomment the line below to run the test immediately
// testAPIs();
