const {
    findUserByIdentifier,
    getUserAchievements
} = require('../../supabase-client');

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

exports.handler = async (event) => {
    // Add CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: headers,
            body: ''
        };
    }
    
    const pathParts = event.path.split('/');
    const accountId = pathParts[pathParts.length - 1];

    if (!accountId || accountId === 'player-achievements') {
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ error: 'Account ID required' })
        };
    }

    const match = await findUserByIdentifier(accountId);

    if (!match) {
        return response(404, { error: 'User not found' });
    }

    const normalizedUsername = match.username;
    const user = match.user;
    const achievementsRows = await getUserAchievements(user.id).catch(() => []);
    const achievements = achievementsRows.map((entry) => entry.achievements || entry).filter(Boolean);

    return response(200, {
        username: normalizedUsername,
        playerName: user.player_name || normalizedUsername,
        achievements,
        totalAchievements: user.total_achievements || 25,
        unlockedAchievements: user.achievements_unlocked || 0
    });
};
