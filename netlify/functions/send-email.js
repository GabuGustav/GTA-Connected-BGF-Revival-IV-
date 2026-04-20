const crypto = require('crypto');
const { findUserByIdentifier, sendMailMessage } = require('../../supabase-client');

exports.handler = async (event) => {
    // Add CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: headers,
            body: ''
        };
    }
    
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { to, subject, message, from } = JSON.parse(event.body);
        
        // Validate required fields
        if (!to || !subject || !message) {
            return {
                statusCode: 400,
                headers: headers,
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

        // Normalize recipient username (remove @bgf.connected if present)
        let toUsername = to.replace('@bgf.connected', '').toLowerCase().trim();
        
        // Check if recipient exists in Supabase
        const recipientUser = await findUserByIdentifier(toUsername);
        if (!recipientUser) {
            return {
                statusCode: 404,
                headers: headers,
                body: JSON.stringify({ 
                    error: 'User not found',
                    message: `User '${toUsername}' is not registered in the BGF system`
                })
            };
        }
        
        // Create message object
        const messageData = {
            from: from || 'system',
            to: toUsername,
            subject: sanitizedSubject,
            message: sanitizedMessage
        };
        
        // Send mail using Supabase
        const result = await sendMailMessage(messageData);
        
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ 
                success: true,
                message: 'Mail sent successfully',
                messageId: result.inbox.id,
                recipient: toUsername,
                subject: sanitizedSubject
            })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};
