const { loadBcrypt } = require('../../netlify/functions/_bcrypt');
const {
    findUserByIdentifier,
    getUserMail
} = require('../../supabase-client');
const {
    createSessionToken,
    buildSessionCookie,
    isSecureRequest
} = require('../../session-auth');
const { jsonResponse } = require('../cors');

async function handleAuthLogin(event) {
    if (event.httpMethod !== 'POST') {
        return jsonResponse(event, 405, { error: 'Method not allowed' });
    }

    try {
        const { username: loginName, password, remember } = JSON.parse(event.body || '{}');
        const normalizedUsername = String(loginName || '').toLowerCase().trim();

        if (!normalizedUsername || !password) {
            return jsonResponse(event, 400, { error: 'Username and password required' });
        }

        const user = await findUserByIdentifier(normalizedUsername);
        if (!user) {
            return jsonResponse(event, 404, { error: 'User not found' });
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
            return jsonResponse(event, 401, { error: 'Incorrect password' });
        }

        const sessionToken = createSessionToken(username, !!remember);
        const cookieHeader = buildSessionCookie(sessionToken, !!remember, isSecureRequest(event));
        const inbox = await getUserMail(username, 'inbox').catch(() => []);
        const sent = await getUserMail(username, 'sent').catch(() => []);

        return jsonResponse(event, 200, {
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
        return jsonResponse(event, 500, { error: 'Internal server error', message: error.message });
    }
}

module.exports = { handleAuthLogin };
