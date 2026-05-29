const bcrypt = require('bcrypt');
const crypto = require('crypto');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root if available (local dev only)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Try to load Supabase client, but don't crash if env vars are missing
let createUser, sendMailMessage;
let hasSupabase = false;
try {
    const supabase = require('../../supabase-client');
    if (supabase.hasSupabaseConfig) {
        createUser = supabase.createUser;
        sendMailMessage = supabase.sendMailMessage;
        hasSupabase = true;
    }
} catch (e) {
    console.log('Supabase not available, falling back to file-based storage:', e.message);
}

// Fallback: use file-based storage when Supabase is unavailable
const fs = require('fs');
const DATA_FILE = path.resolve(__dirname, '../../data.json');

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
    }
}

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

        if (hasSupabase) {
            // Use Supabase storage
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

            // Send welcome mail (non-critical, can fail silently)
            try {
                await sendMailMessage({
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
        } else {
            // Fallback to file-based storage
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
                inbox: [
                    {
                        from: 'system',
                        subject: 'Welcome to BGF Mail!',
                        message: `Welcome ${normalizedUsername}@bgf.connected! Your account has been created successfully.`,
                        date: new Date().toISOString(),
                        read: false
                    }
                ],
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
        }
    } catch (error) {
        if (error.code === '23505' || String(error.message || '').toLowerCase().includes('duplicate')) {
            return response(409, { error: 'Username already exists' });
        }
        return response(500, { error: 'Internal server error', message: error.message });
    }
};