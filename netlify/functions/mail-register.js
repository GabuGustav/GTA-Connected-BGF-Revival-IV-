const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Data storage (in production, use a real database)
const dataFile = path.join(__dirname, '..', '..', 'data.json');

function loadData() {
    if (fs.existsSync(dataFile)) {
        return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    }
    return {};
}

function saveData(data) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { username, action } = JSON.parse(event.body);
        
        // Validate required fields
        if (!username) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Username required' })
            };
        }
        
        const users = loadData();
        const usernameLower = username.toLowerCase().trim();
        
        if (action === 'register') {
            // Register user for mail system
            if (!users[usernameLower]) {
                users[usernameLower] = {
                    username: usernameLower,
                    inbox: [],
                    sent: [],
                    created_at: new Date().toISOString()
                };
                saveData(users);
                
                return {
                    statusCode: 200,
                    body: JSON.stringify({ 
                        success: true,
                        message: 'User registered for mail system',
                        username: usernameLower
                    })
                };
            } else {
                return {
                    statusCode: 409,
                    body: JSON.stringify({ 
                        success: false,
                        error: 'User already registered',
                        username: usernameLower
                    })
                };
            }
        } else if (action === 'check') {
            // Check if user exists
            const exists = !!users[usernameLower];
            
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    exists: exists,
                    username: usernameLower,
                    hasInbox: exists ? (users[usernameLower].inbox || []).length : 0,
                    hasSent: exists ? (users[usernameLower].sent || []).length : 0
                })
            };
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid action. Use "register" or "check"' })
            };
        }

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};
