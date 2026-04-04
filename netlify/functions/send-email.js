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
        const { to, subject, message, from } = JSON.parse(event.body);
        
        // Validate required fields
        if (!to || !subject || !message) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required fields: to, subject, message' })
            };
        }
        
        // Sanitize input to prevent XSS
        const sanitizeHtml = (str) => {
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
        };
        
        const sanitizedSubject = sanitizeHtml(subject);
        const sanitizedMessage = sanitizeHtml(message);

        // Load user data
        const users = loadData();
        
        // Normalize recipient username (remove @bgf.connected if present)
        let toUsername = to.replace('@bgf.connected', '').toLowerCase().trim();
        
        // Check if recipient exists
        if (!users[toUsername]) {
            return {
                statusCode: 404,
                body: JSON.stringify({ 
                    error: 'User not found',
                    message: `User '${toUsername}' is not registered in the BGF system`,
                    availableUsers: Object.keys(users).map(u => `${u}@bgf.connected`)
                })
            };
        }
        
        // Initialize mail arrays if they don't exist
        if (!users[toUsername].inbox) {
            users[toUsername].inbox = [];
        }
        if (!users[toUsername].sent) {
            users[toUsername].sent = [];
        }
        
        // Also initialize sender's mail arrays if they exist
        if (from && users[from]) {
            if (!users[from].inbox) {
                users[from].inbox = [];
            }
            if (!users[from].sent) {
                users[from].sent = [];
            }
        }
        
        // Create message object
        const messageData = {
            from: from || 'system',
            to: toUsername,
            subject: sanitizedSubject,
            message: sanitizedMessage,
            date: new Date().toISOString(),
            read: false,
            id: crypto.randomUUID()
        };
        
        // Add to recipient's inbox
        users[toUsername].inbox.unshift(messageData);
        
        // Add to sender's sent items (if sender is a registered user)
        if (from && users[from]) {
            users[from].sent.unshift({
                ...messageData,
                to: toUsername
            });
        }
        
        // Save data
        saveData(users);
        
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                success: true,
                message: 'Mail sent successfully',
                messageId: messageData.id,
                recipient: toUsername,
                subject: sanitizedSubject
            })
        };

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
