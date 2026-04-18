const bcrypt = require('bcrypt');
const { loadData, findUserByIdentifier, response } = require('./_jobs_data');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return response(405, { error: 'Method not allowed' });
    }

    try {
        const { username, password } = JSON.parse(event.body || '{}');
        const normalizedUsername = String(username || '').toLowerCase().trim();

        if (!normalizedUsername || !password) {
            return response(400, { error: 'Username and password required' });
        }

        const users = loadData();
        const match = findUserByIdentifier(users, normalizedUsername);
        if (!match) {
            return response(404, { error: 'User not found' });
        }

        const storedUser = match.user;
        const storedPassword = storedUser.password || '';
        let passwordMatches = false;

        if (typeof storedPassword === 'string' && storedPassword.startsWith('$2')) {
            passwordMatches = await bcrypt.compare(password, storedPassword);
        } else {
            passwordMatches = storedPassword === password;
        }

        if (!passwordMatches) {
            return response(401, { error: 'Incorrect password' });
        }

        return response(200, {
            success: true,
            user: {
                username: match.username,
                playerName: storedUser.player_name || match.username,
                inbox: storedUser.inbox || [],
                sent: storedUser.sent || [],
                achievements: storedUser.achievements || [],
                global_stats: storedUser.global_stats || null,
                ranks: storedUser.ranks || null
            }
        });
    } catch (error) {
        return response(500, { error: 'Internal server error', message: error.message });
    }
};
