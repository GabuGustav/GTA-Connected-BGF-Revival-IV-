const { loadData, findUserByIdentifier, response } = require('./_jobs_data');

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

    const users = loadData();
    const match = findUserByIdentifier(users, accountId);

    if (!match) {
        return {
            statusCode: 404,
            headers: headers,
            body: JSON.stringify({ error: 'User not found' })
        };
    }

    const normalizedUsername = match.username;
    const user = match.user;

    return {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify({
            username: normalizedUsername,
            playerName: user.player_name || normalizedUsername,
            achievements: user.achievements || [],
            totalAchievements: user.global_stats?.total_achievements || 25,
            unlockedAchievements: user.global_stats?.achievements_unlocked || 0
        })
    };
};
