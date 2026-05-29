const { loadBcrypt } = require('./_bcrypt');
const {
    findUserByIdentifier,
    getUserMail
} = require('../../supabase-client');
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
        const { username, password, remember } = JSON.parse(event.body || '{}');
        const normalizedUsername = String(username || '').toLowerCase().trim();

        if (!normalizedUsername || !password) {
            return response(400, { error: 'Username and password required' });
        }

        const user = await findUserByIdentifier(normalizedUsername);
        if (!user) {
            return response(404, { error: 'User not found' });
        }

        const username = user.username;
        const storedPassword = user.password_hash || user.password || '';
        let passwordMatches = false;
        const bcrypt = loadBcrypt();

        if (typeof storedPassword === 'string' && storedPassword.startsWith('$2')) {
            passwordMatches = await bcrypt.compare(password, storedPassword);
        } else {
            passwordMatches = storedPassword === password;
        }

        if (!passwordMatches) {
            return response(401, { error: 'Incorrect password' });
        }

        const sessionToken = createSessionToken(username, !!remember);
        const cookieHeader = buildSessionCookie(sessionToken, !!remember, isSecureRequest(event));
        const inbox = await getUserMail(username, 'inbox').catch(() => []);
        const sent = await getUserMail(username, 'sent').catch(() => []);

        return response(200, {
            success: true,
            user: {
                username,
                playerName: user.player_name || username,
                inbox,
                sent,
                achievements: user.achievements || [],
                global_stats: user.global_stats || null,
                ranks: user.ranks || null
            }
        }, {
            'Set-Cookie': cookieHeader
        });
    } catch (error) {
        return response(500, { error: 'Internal server error', message: error.message });
    }
};
