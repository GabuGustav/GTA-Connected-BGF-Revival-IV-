const fetch = require('node-fetch');

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
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid email format' })
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

        // Brevo API call with environment variable
        const apiKey = process.env.BREVO_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'API key not configured' })
            };
        }

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': apiKey,
                'content-type': 'application/json',
                'accept': 'application/json'
            },
            body: JSON.stringify({
                sender: {
                    email: from || 'noreply@bgf.connected',
                    name: 'BGF Mail System'
                },
                to: [{ email: to }],
                subject: sanitizedSubject,
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a1a; color: #fff;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #00ff9f; text-shadow: 0 0 10px rgba(0, 255, 159, 0.5);">BGF Mail</h1>
                            <p style="color: #888;">Official BGF Connected Mail System</p>
                        </div>
                        <div style="background: #2a2a2a; padding: 20px; border-radius: 10px; border: 1px solid #00ff9f;">
                            <h2 style="color: #00ff9f; margin-bottom: 15px;">${sanitizedSubject}</h2>
                            <div style="color: #fff; line-height: 1.6;">${sanitizedMessage.replace(/\n/g, '<br>')}</div>
                        </div>
                        <div style="margin-top: 30px; text-align: center; color: #888; font-size: 12px;">
                            <p>Sent from BGF Connected Mail System</p>
                            <p>Time: ${new Date().toLocaleString()}</p>
                            <p>This is an automated message</p>
                        </div>
                    </div>
                `,
                textContent: `BGF Mail\n\n${sanitizedSubject}\n\n${sanitizedMessage}\n\nSent from BGF Connected Mail System\nTime: ${new Date().toLocaleString()}`
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ 
                    error: 'Brevo API error',
                    details: data 
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                success: true,
                messageId: data.messageId,
                details: data 
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
