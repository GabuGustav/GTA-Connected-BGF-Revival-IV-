const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { loadData, response } = require('./_jobs_data');

const dataFile = path.join(__dirname, '..', '..', 'data.json');

function saveData(data) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return response(405, { error: 'Method not allowed' });
    }

    try {
        const { username, email, password } = JSON.parse(event.body || '{}');
        const normalizedUsername = String(username || '').toLowerCase().trim().replace(/[^a-z0-9_]/g, '');

        if (!normalizedUsername || normalizedUsername.length < 3) {
            return response(400, { error: 'Username must be at least 3 valid characters' });
        }

        if (!password || password.length < 6) {
            return response(400, { error: 'Password must be at least 6 characters' });
        }

        const users = loadData();
        if (users[normalizedUsername]) {
            return response(409, { error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        users[normalizedUsername] = {
            password: hashedPassword,
            email: email || '',
            created_at: new Date().toISOString(),
            created_from_game: false,
            gta_linked: false,
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

        saveData(users);

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
        return response(500, { error: 'Internal server error', message: error.message });
    }
};
