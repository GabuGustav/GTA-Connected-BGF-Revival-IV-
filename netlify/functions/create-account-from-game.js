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
    createGameLinkedUser,
    sendMailMessage
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
        const webPassword = payload.webPassword != null ? String(payload.webPassword) : '';

        if (!gamePassword || gamePassword.length < 6) {
            return response(400, { error: 'Game password must be at least 6 characters' });
        }

        if (webPassword && webPassword.length < 6) {
            return response(400, { error: 'Website password must be at least 6 characters' });
        }

        const existing = await findUserByIdentifier(username);
        if (existing) {
            if (existing.gta_linked && existing.game_password_hash) {
                return response(409, { error: 'Account already exists', code: 'ACCOUNT_EXISTS' });
            }

            if (existing.password_hash && !existing.game_password_hash) {
                return response(409, {
                    error: 'Website account exists. Link your game account instead.',
                    code: 'WEB_ACCOUNT_EXISTS',
                    action: 'link-game-account',
                    username
                });
            }

            return response(409, { error: 'Account already exists', code: 'ACCOUNT_EXISTS' });
        }

        const bcrypt = loadBcrypt();
        const gamePasswordHash = await bcrypt.hash(gamePassword, 10);
        const webPasswordHash = webPassword ? await bcrypt.hash(webPassword, 10) : null;

        const user = await createGameLinkedUser({
            username,
            game_password_hash: gamePasswordHash,
            password_hash: webPasswordHash,
            player_name: payload.playerName || username,
            gta_account_id: username,
            last_ip: payload.playerIp || null
        });

        try {
            await sendMailMessage({
                from: 'system',
                to: username,
                subject: 'Welcome to BGF Revival IV!',
                message: `Welcome ${username}! Your game account is linked to BGF Mail. Use your website password here; your game password is only for in-game /jobauth.`
            });
        } catch (mailError) {
            console.warn('create-account-from-game welcome mail:', mailError.message);
        }

        return response(201, {
            success: true,
            username: user.username,
            gta_linked: true,
            has_web_password: Boolean(webPasswordHash),
            message: webPasswordHash
                ? 'Game and website accounts created with the same username.'
                : 'Game account created. Set a website password on the mail site to log in there.'
        });
    } catch (error) {
        console.error('create-account-from-game error:', error);
        if (error.code === '23505') {
            return response(409, { error: 'Account already exists', code: 'ACCOUNT_EXISTS' });
        }
        return response(500, { error: 'Internal server error', message: error.message });
    }
};
