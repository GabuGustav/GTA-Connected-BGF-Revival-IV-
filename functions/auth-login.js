import bcrypt from 'bcryptjs';
import { jsonResponse, supabaseRest } from './lib/cf-http.js';
import { createSessionToken, buildSessionCookie, isSecureRequest } from './lib/cf-session.js';

async function findUserByIdentifier(env, identifier) {
    const normalized = String(identifier || '').toLowerCase().trim();
    if (!normalized) return null;

    const filters = [
        `username=eq.${encodeURIComponent(normalized)}`,
        `player_name=eq.${encodeURIComponent(identifier)}`,
        `gta_account_id=eq.${encodeURIComponent(normalized)}`
    ];

    for (const filter of filters) {
        const res = await supabaseRest(env, `/users?${filter}&limit=1`, { method: 'GET' });
        if (!res.ok) continue;
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
            return rows[0];
        }
    }

    return null;
}

export async function onRequest(context) {
    const { request, env } = context;

    try {
        if (request.method !== 'POST') {
            return jsonResponse(request, 405, { error: 'Method not allowed' });
        }

        const { username: loginName, password, remember } = await request.json();
        const normalizedUsername = String(loginName || '').toLowerCase().trim();

        if (!normalizedUsername || !password) {
            return jsonResponse(request, 400, { error: 'Username and password required' });
        }

        const user = await findUserByIdentifier(env, normalizedUsername);
        if (!user) {
            return jsonResponse(request, 404, { error: 'User not found' });
        }

        const storedPassword = user.password_hash || user.password || '';
        let passwordMatches = false;

        if (typeof storedPassword === 'string' && storedPassword.startsWith('$2')) {
            passwordMatches = await bcrypt.compare(password, storedPassword);
        } else {
            passwordMatches = storedPassword === password;
        }

        if (!passwordMatches) {
            return jsonResponse(request, 401, { error: 'Incorrect password' });
        }

        const secret = env.API_SECRET_KEY || 'default-secret-key-change-in-production';
        const sessionToken = await createSessionToken(user.username, !!remember, secret);
        const cookieHeader = buildSessionCookie(sessionToken, !!remember, isSecureRequest(request));

        return jsonResponse(request, 200, {
            success: true,
            user: {
                username: user.username,
                playerName: user.player_name || user.username,
                inbox: [],
                sent: [],
                achievements: user.achievements || [],
                global_stats: user.global_stats || null,
                ranks: user.ranks || null
            }
        }, {
            'Set-Cookie': cookieHeader
        });
    } catch (error) {
        console.error('auth-login:', error);
        return jsonResponse(request, 500, {
            error: 'Internal server error',
            message: error.message
        });
    }
}
