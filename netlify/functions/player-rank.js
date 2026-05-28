const {
    findUserByIdentifier,
    getUserRanks
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
    const jobType = pathParts[pathParts.length - 1];
    const accountId = pathParts[pathParts.length - 2];

    if (!accountId || !jobType || accountId === 'player-rank') {
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ error: 'Account ID and job type required' })
        };
    }

    const match = await findUserByIdentifier(accountId);

    if (!match) {
        return response(404, { error: 'User not found' });
    }

    const normalizedUsername = match.username;
    const user = match.user;
    const userRanks = await getUserRanks(user.id).catch(() => []);
    const rankEntry = userRanks.find((entry) => entry.job_type === jobType);
    const rankData = rankEntry ? {
        level: rankEntry.level,
        experience: rankEntry.experience,
        next_level_xp: rankEntry.next_level_xp,
        title: rankEntry.title,
        stats: {
            arrests_made: rankEntry.arrests_made,
            tickets_issued: rankEntry.tickets_issued,
            pursuits_completed: rankEntry.pursuits_completed,
            patients_treated: rankEntry.patients_treated,
            lives_saved: rankEntry.lives_saved,
            response_time_avg: rankEntry.response_time_avg,
            vehicles_repaired: rankEntry.vehicles_repaired,
            custom_jobs: rankEntry.custom_jobs,
            avg_repair_time: rankEntry.avg_repair_time,
            missions_completed: rankEntry.missions_completed,
            properties_owned: rankEntry.properties_owned,
            wealth_earned: rankEntry.wealth_earned,
            time_played: rankEntry.time_played,
            time_in_service: rankEntry.time_in_service
        }
    } : null;

    if (!rankData) {
        return response(404, { error: 'Job type not found' });
    }

    return response(200, {
        username: normalizedUsername,
        playerName: user.player_name || normalizedUsername,
        jobType,
        rank: rankData,
        globalStats: {
            total_playtime: user.total_playtime || 0,
            last_active: user.last_active || null,
            achievements_unlocked: user.achievements_unlocked || 0,
            total_achievements: user.total_achievements || 25
        }
    });
};
