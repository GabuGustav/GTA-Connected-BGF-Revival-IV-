const { loadBcrypt } = require('./_bcrypt');
const {
    response,
    corsPreflight,
    parseBridgePayload,
    authenticateGtaBridge,
    normalizeUsername,
    validateUsername
} = require('./_gta_bridge');
const {
    hasSupabaseConfig,
    findUserByIdentifier,
    linkGamePasswordToUser
} = require('../../supabase-client');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return corsPreflight();
    }

    if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
        return response(405, { error: 'Method not allowed' });
    }

    const auth = authenticateGtaBridge(event);
    if (!auth.ok) {
        return response(401, { error: auth.error });
    }

    if (!hasSupabaseConfig) {
        return response(503, { error: 'Supabase is not configured on this deployment' });
    }

    try {
        const payload = parseBridgePayload(event) || {};
        const username = normalizeUsername(payload.username);
        const usernameError = validateUsername(username);
        if (usernameError) {
            return response(400, { error: usernameError });
        }

        const gamePassword = String(payload.gamePassword || payload.password || '');
        const webPassword = String(payload.webPassword || '');

        if (!gamePassword || gamePassword.length < 6) {
            return response(400, { error: 'Game password must be at least 6 characters' });
        }

        if (!webPassword) {
            return response(400, { error: 'Website password required to verify account ownership' });
        }

        const user = await findUserByIdentifier(username);
        if (!user) {
            return response(404, { error: 'Website account not found. Register on the site first or use create-account-from-game.' });
        }

        if (!user.password_hash) {
            return response(400, {
                error: 'This account has no website password yet. Register on the mail site first.',
                code: 'NO_WEB_PASSWORD'
            });
        }

        if (user.gta_linked && user.game_password_hash) {
            return response(409, { error: 'Game account is already linked', code: 'ALREADY_LINKED' });
        }

        const bcrypt = loadBcrypt();
        const webMatches = await bcrypt.compare(webPassword, user.password_hash);
        if (!webMatches) {
            return response(401, { error: 'Incorrect website password' });
        }

        const gamePasswordHash = await bcrypt.hash(gamePassword, 10);
        const updated = await linkGamePasswordToUser(username, {
            game_password_hash: gamePasswordHash,
            gta_account_id: username,
            player_name: payload.playerName || user.player_name || username
        });

        return response(200, {
            success: true,
            username: updated.username,
            gta_linked: true,
            message: 'Game account linked. Use your game password in-game and website password on the mail site.'
        });
    } catch (error) {
        console.error('link-game-account error:', error);
        return response(500, { error: 'Internal server error', message: error.message });
    }
};
