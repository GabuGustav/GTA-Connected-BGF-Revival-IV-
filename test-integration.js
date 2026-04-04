// Test script for GTA-Website integration
const crypto = require('crypto');

// Configuration
const API_SECRET = 'default-secret-key-change-in-production';
const API_URL = 'http://localhost:3001/api';

// Generate signature for authentication
function generateSignature(payload, timestamp) {
    const data = payload + timestamp;
    return crypto.createHmac('sha256', API_SECRET).update(data).digest('hex');
}

// Test account creation
async function testAccountCreation() {
    console.log('Testing account creation...');
    
    const payload = JSON.stringify({
        username: 'testplayer',
        password: 'testpass123',
        playerName: 'Test Player',
        playerIp: '127.0.0.1'
    });
    
    const timestamp = Date.now().toString();
    const signature = generateSignature(payload, timestamp);
    
    try {
        const response = await fetch(API_URL + '/create-account-from-game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Signature': signature,
                'X-Timestamp': timestamp,
                'X-API-Key': 'gta-server-api-key'
            },
            body: payload
        });
        
        const result = await response.json();
        console.log('Account creation result:', result);
        
        if (result.success) {
            console.log('✅ Account created successfully');
            return result.username;
        } else {
            console.log('❌ Account creation failed:', result.error);
            return null;
        }
    } catch (error) {
        console.error('❌ Network error:', error.message);
        return null;
    }
}

// Test batch sync
async function testBatchSync() {
    console.log('Testing batch sync...');
    
    const payload = JSON.stringify({
        playerUpdates: [
            {
                username: 'testplayer',
                jobType: 'police',
                stats: {
                    arrests_made: 5,
                    tickets_issued: 10,
                    time_in_service: 2.5
                },
                experience: 150,
                newLevel: 2
            }
        ]
    });
    
    const timestamp = Date.now().toString();
    const signature = generateSignature(payload, timestamp);
    
    try {
        const response = await fetch(API_URL + '/batch-sync-stats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Signature': signature,
                'X-Timestamp': timestamp,
                'X-API-Key': 'gta-server-api-key'
            },
            body: payload
        });
        
        const result = await response.json();
        console.log('Batch sync result:', result);
        
        if (result.success) {
            console.log('✅ Batch sync successful');
        } else {
            console.log('❌ Batch sync failed:', result.error);
        }
    } catch (error) {
        console.error('❌ Network error:', error.message);
    }
}

// Test player rank retrieval
async function testPlayerRank(username) {
    console.log('Testing player rank retrieval...');
    
    try {
        const response = await fetch(API_URL + `/player-rank/${username}/police`);
        const result = await response.json();
        console.log('Player rank result:', result);
        
        if (result.rank) {
            console.log('✅ Player rank retrieved successfully');
        } else {
            console.log('❌ Player rank retrieval failed:', result.error);
        }
    } catch (error) {
        console.error('❌ Network error:', error.message);
    }
}

// Test leaderboard
async function testLeaderboard() {
    console.log('Testing leaderboard...');
    
    try {
        const response = await fetch(API_URL + '/leaderboard/police?limit=10');
        const result = await response.json();
        console.log('Leaderboard result:', result);
        
        if (result.leaderboard) {
            console.log('✅ Leaderboard retrieved successfully');
            console.log(`Total players: ${result.totalPlayers}`);
        } else {
            console.log('❌ Leaderboard retrieval failed:', result.error);
        }
    } catch (error) {
        console.error('❌ Network error:', error.message);
    }
}

// Test achievements
async function testAchievements(username) {
    console.log('Testing achievements...');
    
    const payload = JSON.stringify({
        username: username,
        newAchievements: [
            {
                id: 'first_arrest',
                name: 'First Arrest',
                description: 'Make your first arrest as a police officer',
                job_type: 'police'
            }
        ]
    });
    
    const timestamp = Date.now().toString();
    const signature = generateSignature(payload, timestamp);
    
    try {
        // Add achievements
        const response = await fetch(API_URL + '/update-achievements', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Signature': signature,
                'X-Timestamp': timestamp,
                'X-API-Key': 'gta-server-api-key'
            },
            body: payload
        });
        
        const result = await response.json();
        console.log('Achievements update result:', result);
        
        if (result.success) {
            console.log('✅ Achievements updated successfully');
            
            // Retrieve achievements
            const achResponse = await fetch(API_URL + `/player-achievements/${username}`);
            const achResult = await achResponse.json();
            console.log('Player achievements:', achResult);
            
            if (achResult.achievements) {
                console.log('✅ Achievements retrieved successfully');
            }
        } else {
            console.log('❌ Achievements update failed:', result.error);
        }
    } catch (error) {
        console.error('❌ Network error:', error.message);
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting GTA-Website Integration Tests\n');
    
    // Test health endpoint first
    try {
        const healthResponse = await fetch(API_URL + '/health');
        const health = await healthResponse.json();
        console.log('✅ API Health check:', health);
    } catch (error) {
        console.error('❌ API Health check failed:', error.message);
        return;
    }
    
    // Test account creation
    const username = await testAccountCreation();
    
    if (username) {
        // Test other endpoints
        await testBatchSync();
        await testPlayerRank(username);
        await testLeaderboard();
        await testAchievements(username);
    }
    
    console.log('\n✅ Integration tests completed!');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
    console.log('Installing node-fetch for Node.js compatibility...');
    const { default: fetch } = require('node-fetch');
    global.fetch = fetch;
}

// Run tests
runAllTests().catch(console.error);
