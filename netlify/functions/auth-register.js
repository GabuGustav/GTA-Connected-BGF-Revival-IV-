const bcrypt = require('bcrypt');
const { createUser, sendMailMessage } = require('../../supabase-client');
const {
    createSessionToken,
    buildSessionCookie,
    isSecureRequest
} = require('../../session-auth');

function response(statusCode, body, extraHeaders = {}) {
    return {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Content-Type': 'application/json',
            ...extraHeaders
        },
        body: JSON.stringify(body)
    };
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return response(405, { error: 'Method not allowed' });
    }

    try {
        const { username, email, password, remember } = JSON.parse(event.body || '{}');
        const normalizedUsername = String(username || '').toLowerCase().trim().replace(/[^a-z0-9_]/g, '');

        if (!normalizedUsername || normalizedUsername.length < 3) {
            return response(400, { error: 'Username must be at least 3 valid characters' });
        }

        if (!password || password.length < 6) {
            return response(400, { error: 'Password must be at least 6 characters' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const sessionToken = createSessionToken(normalizedUsername, !!remember);
        const cookieHeader = buildSessionCookie(sessionToken, !!remember, isSecureRequest(event));
        const user = await createUser({
            username: normalizedUsername,
            password_hash: hashedPassword,
            player_name: normalizedUsername,
            gta_linked: false,
            created_from_game: false,
            total_playtime: 0,
            achievements_unlocked: 0,
            total_achievements: 25
        });

        const welcomeMail = {
            from: 'system',
            subject: 'Welcome to BGF Mail!',
            message: `Welcome ${normalizedUsername}@bgf.connected! Your account has been created successfully.`,
            date: new Date().toISOString(),
            read: false
        };

        try {
            await sendMailMessage({
                from: 'system',
                to: normalizedUsername,
                subject: 'Welcome to BGF Mail!',
                message: welcomeMail.message
            });
        } catch (mailError) {
            console.warn('Unable to create welcome mail:', mailError.message);
        }

        return response(201, {
            success: true,
            user: {
                username: user.username,
                playerName: user.player_name || normalizedUsername,
                inbox: [welcomeMail],
                sent: [],
                achievements: []
            }
        }, {
            'Set-Cookie': cookieHeader
        });
    } catch (error) {
        if (error.code === '23505' || String(error.message || '').toLowerCase().includes('duplicate')) {
            return response(409, { error: 'Username already exists' });
        }
        return response(500, { error: 'Internal server error', message: error.message });
    }
};
