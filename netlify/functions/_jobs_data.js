const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '..', '..', 'data.json');

function loadData() {
    if (fs.existsSync(dataFile)) {
        return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    }
    return {};
}

function findUserByIdentifier(users, identifier) {
    if (!identifier) {
        return null;
    }

    const normalized = identifier.toLowerCase();
    if (users[normalized]) {
        return {
            username: normalized,
            user: users[normalized]
        };
    }

    for (const [username, user] of Object.entries(users)) {
        const playerName = String(user.player_name || '').toLowerCase();
        if (playerName && playerName === normalized) {
            return {
                username,
                user
            };
        }
    }

    return null;
}

function response(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}

module.exports = {
    loadData,
    findUserByIdentifier,
    response
};
