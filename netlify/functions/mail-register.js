const {
    findUserByIdentifier,
    getUserMail
} = require('../../supabase-client');

function response(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return response(200, {});
    }

    if (event.httpMethod !== 'POST') {
        return response(405, { error: 'Method not allowed' });
    }

    try {
        const { username, action } = JSON.parse(event.body || '{}');
        const normalizedUsername = String(username || '').toLowerCase().trim();

        if (!normalizedUsername) {
            return response(400, { error: 'Username required' });
        }

        const match = await findUserByIdentifier(normalizedUsername);

        if (action === 'register') {
            if (!match) {
                return response(404, {
                    success: false,
                    error: 'User not found',
                    username: normalizedUsername
                });
            }

            const inbox = await getUserMail(match.username, 'inbox').catch(() => []);
            const sent = await getUserMail(match.username, 'sent').catch(() => []);

            return response(200, {
                success: true,
                message: 'User is registered for the mail system',
                username: match.username,
                hasInbox: inbox.length,
                hasSent: sent.length
            });
        }

        if (action === 'check') {
            const inbox = match ? await getUserMail(match.username, 'inbox').catch(() => []) : [];
            const sent = match ? await getUserMail(match.username, 'sent').catch(() => []) : [];

            return response(200, {
                exists: !!match,
                username: normalizedUsername,
                hasInbox: inbox.length,
                hasSent: sent.length
            });
        }

        return response(400, { error: 'Invalid action. Use "register" or "check"' });
    } catch (error) {
        console.error('Function error:', error);
        return response(500, {
            error: 'Internal server error',
            message: error.message
        });
    }
};
