// ═══════════════════════════════════════════════════════════
// BGF Revival IV - Auth Register (Netlify Function)
// ═══════════════════════════════════════════════════════════
// NOTE: bcrypt has native bindings that often fail on Netlify
// Lambda. We lazy-load it inside the handler so the module
// can still register even if bcrypt fails at cold start.
// ═══════════════════════════════════════════════════════════

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { loadBcrypt } = require('./_bcrypt');

// Load .env from project root (safe to call even in production)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DATA_FILE = path.resolve(__dirname, '../../data.json');

// ── Helper: file-based user storage (fallback when Supabase is unavailable) ──

function loadUsers() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Error loading data.json:', e.message);
    }
    return {};
}

function saveUsers(users) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
    } catch (e) {
        console.error('Error saving data.json:', e.message);
        // On Netlify serverless, writes to /tmp may work; data.json in project root won't persist.
        // Acceptable: Supabase should be used in production.
    }
}

// ── Response helper ──

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

// ── Handler ──

exports.handler = async (event) => {
    // Preflight
    if (event.httpMethod === 'OPTIONS') {
        return response(200, {});
    }
    if (event.httpMethod !== 'POST') {
        return response(405, { error: 'Method not allowed' });
    }

    let bcrypt;
    try {
        bcrypt = loadBcrypt();
    } catch (_) {
        return response(500, {
            error: 'Password hashing library unavailable on this platform',
            message: 'bcryptjs could not be loaded'
        });
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

        // ── Try Supabase first ──
        try {
            const supabase = require('../../supabase-client');
            if (supabase.hasSupabaseConfig) {
                const user = await supabase.createUser({
                    username: normalizedUsername,
                    password_hash: hashedPassword,
                    player_name: normalizedUsername,
                    gta_linked: false,
                    created_from_game: false,
                    total_playtime: 0,
                    achievements_unlocked: 0,
                    total_achievements: 25
                });

                // Send welcome mail (non-critical)
                try {
                    await supabase.sendMailMessage({
                        from: 'system',
                        to: normalizedUsername,
                        subject: 'Welcome to BGF Mail!',
                        message: `Welcome ${normalizedUsername}@bgf.connected! Your account has been created successfully.`
                    });
                } catch (mailError) {
                    console.warn('Unable to create welcome mail:', mailError.message);
                }

                return response(201, {
                    success: true,
                    user: {
                        username: user.username,
                        playerName: user.player_name || normalizedUsername,
                        inbox: [{
                            from: 'system',
                            subject: 'Welcome to BGF Mail!',
                            message: `Welcome ${normalizedUsername}@bgf.connected! Your account has been created successfully.`,
                            date: new Date().toISOString(),
                            read: false
                        }],
                        sent: [],
                        achievements: []
                    }
                });
            }
        } catch (supabaseError) {
            if (supabaseError.code === '23505' || String(supabaseError.message || '').toLowerCase().includes('duplicate')) {
                return response(409, { error: 'Username already exists' });
            }
            console.log('Supabase registration fallback:', supabaseError.message);
        }

        // ── Fallback: file-based storage ──
        const users = loadUsers();
        if (users[normalizedUsername]) {
            return response(409, { error: 'Username already exists' });
        }

        users[normalizedUsername] = {
            password: hashedPassword,
            email: email || '',
            created_at: new Date().toISOString(),
            created_from_game: false,
            gta_linked: false,
            player_name: normalizedUsername,
            inbox: [{
                from: 'system',
                subject: 'Welcome to BGF Mail!',
                message: `Welcome ${normalizedUsername}@bgf.connected! Your account has been created successfully.`,
                date: new Date().toISOString(),
                read: false
            }],
            sent: [],
            achievements: []
        };

        saveUsers(users);

        return response(201, {
            success: true,
            user: {
                username: normalizedUsername,
                playerName: normalizedUsername,
                inbox: users[normalizedUsername].inbox,
                sent: [],
                achievements: []
            }
        });

    } catch (error) {
        console.error('auth-register error:', error);
        if (error.code === '23505' || String(error.message || '').toLowerCase().includes('duplicate')) {
            return response(409, { error: 'Username already exists' });
        }
        return response(500, { error: 'Internal server error', message: error.message });
    }
};