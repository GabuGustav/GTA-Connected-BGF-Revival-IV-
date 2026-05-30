const { jsonResponse } = require('../cors');
const { loadBcrypt } = require('../bcrypt');

try {
    require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
} catch (_) {}

function getDataFile() {
    return require('path').resolve(__dirname, '../../data.json');
}

function loadUsers() {
    try {
        const fs = require('fs');
        const dataFile = getDataFile();
        if (fs.existsSync(dataFile)) {
            return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        }
    } catch (e) {
        console.error('Error loading data.json:', e.message);
    }
    return {};
}

function saveUsers(users) {
    try {
        const fs = require('fs');
        fs.writeFileSync(getDataFile(), JSON.stringify(users, null, 2));
    } catch (e) {
        console.error('Error saving data.json:', e.message);
    }
}

async function handleAuthRegister(event) {
    if (event.httpMethod !== 'POST') {
        return jsonResponse(event, 405, { error: 'Method not allowed' });
    }

    let bcrypt;
    try {
        bcrypt = loadBcrypt();
    } catch (_) {
        return jsonResponse(event, 500, {
            error: 'Password hashing library unavailable on this platform',
            message: 'bcryptjs could not be loaded'
        });
    }

    try {
        const { username, email, password } = JSON.parse(event.body || '{}');
        const normalizedUsername = String(username || '').toLowerCase().trim().replace(/[^a-z0-9_]/g, '');

        if (!normalizedUsername || normalizedUsername.length < 3) {
            return jsonResponse(event, 400, { error: 'Username must be at least 3 valid characters' });
        }

        if (!password || password.length < 6) {
            return jsonResponse(event, 400, { error: 'Password must be at least 6 characters' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        try {
            const supabase = require('../supabase-client');
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

                return jsonResponse(event, 201, {
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
                return jsonResponse(event, 409, { error: 'Username already exists' });
            }
            console.log('Supabase registration fallback:', supabaseError.message);
        }

        const users = loadUsers();
        if (users[normalizedUsername]) {
            return jsonResponse(event, 409, { error: 'Username already exists' });
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

        return jsonResponse(event, 201, {
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
            return jsonResponse(event, 409, { error: 'Username already exists' });
        }
        return jsonResponse(event, 500, { error: 'Internal server error', message: error.message });
    }
}

module.exports = { handleAuthRegister };
