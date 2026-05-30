import bcrypt from 'bcryptjs';
import {
    jsonResponse,
    supabaseRest,
    readSupabaseError,
    isDuplicateError
} from './lib/cf-http.js';

const DEFAULT_JOB_TYPES = ['police', 'medic', 'mechanic', 'civilian'];

async function ensureDefaultUserRanks(env, userId) {
    const rows = DEFAULT_JOB_TYPES.map((jobType) => ({
        user_id: userId,
        job_type: jobType,
        level: 1,
        experience: 0,
        next_level_xp: 100,
        title: 'Newcomer'
    }));

    await supabaseRest(env, '/user_ranks?on_conflict=user_id,job_type', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows)
    });
}

async function sendWelcomeMail(env, username) {
    const message = {
        from_username: 'system',
        to_username: username,
        subject: 'Welcome to BGF Mail!',
        message: `Welcome ${username}@bgf.connected! Your account has been created successfully.`,
        read_status: false,
        message_type: 'inbox'
    };

    const mailRes = await supabaseRest(env, '/mail_messages', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(message)
    });
    if (!mailRes.ok) {
        console.warn('welcome mail failed', mailRes.status);
    }
}

export async function onRequest(context) {
    const { request, env } = context;

    try {
        if (request.method !== 'POST') {
            return jsonResponse(request, 405, { error: 'Method not allowed' });
        }

        const { username, email, password } = await request.json();
        const normalizedUsername = String(username || '').toLowerCase().trim().replace(/[^a-z0-9_]/g, '');

        if (!normalizedUsername || normalizedUsername.length < 3) {
            return jsonResponse(request, 400, { error: 'Username must be at least 3 valid characters' });
        }

        if (!password || password.length < 6) {
            return jsonResponse(request, 400, { error: 'Password must be at least 6 characters' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const insertRes = await supabaseRest(env, '/users', {
            method: 'POST',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify({
                username: normalizedUsername,
                password_hash: hashedPassword,
                player_name: normalizedUsername,
                gta_linked: false,
                created_from_game: false,
                total_playtime: 0,
                achievements_unlocked: 0,
                total_achievements: 25
            })
        });

        const insertPayload = await readSupabaseError(insertRes);

        if (!insertRes.ok) {
            if (isDuplicateError(insertRes, insertPayload)) {
                return jsonResponse(request, 409, { error: 'Username already exists' });
            }
            return jsonResponse(request, 500, {
                error: 'Database error',
                message: insertPayload.message || insertPayload.error || insertRes.statusText
            });
        }

        const user = Array.isArray(insertPayload) ? insertPayload[0] : insertPayload;

        try {
            await ensureDefaultUserRanks(env, user.id);
        } catch (rankError) {
            console.warn('user_ranks setup:', rankError.message);
        }

        await sendWelcomeMail(env, normalizedUsername);

        const welcomeInbox = [{
            from: 'system',
            subject: 'Welcome to BGF Mail!',
            message: `Welcome ${normalizedUsername}@bgf.connected! Your account has been created successfully.`,
            date: new Date().toISOString(),
            read: false
        }];

        return jsonResponse(request, 201, {
            success: true,
            user: {
                username: user.username || normalizedUsername,
                playerName: user.player_name || normalizedUsername,
                email: email || '',
                inbox: welcomeInbox,
                sent: [],
                achievements: []
            }
        });
    } catch (error) {
        console.error('auth-register:', error);
        return jsonResponse(request, 500, {
            error: 'Internal server error',
            message: error.message
        });
    }
}
