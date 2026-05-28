const crypto = require('crypto');
const {
    findUserByIdentifier,
    getUserMail,
    getUserRanks,
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

// HMAC verification function
function verifySignature(payload, signature, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    return crypto.timingSafeEqual(signature, expectedSignature);
}

exports.handler = async (event, context) => {
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
    
    // Extract username from pathParameters
    const pathParts = event.path.split('/');
    const username = pathParts[pathParts.length - 1];
    
    if (!username || username === 'profile') {
        return response(400, { error: 'Username required' });
    }
    
    // Verify HMAC signature if provided
    const providedSignature = event.headers['x-bgf-signature'];
    if (providedSignature) {
        const payload = JSON.stringify(event.pathParameters);
        const API_SECRET = process.env.API_SECRET_KEY || 'default-secret-key-change-in-production';
        
        if (!verifySignature(payload, providedSignature, API_SECRET)) {
            return response(401, { error: 'Invalid signature' });
        }
    }
    
    let match;
    try {
        match = await findUserByIdentifier(username);
    } catch (error) {
        return response(500, { error: 'Profile backend misconfigured', message: error.message });
    }
    
    if (!match) {
        return response(404, { error: 'User not found' });
    }

    const user = match.user;
    const userRanks = await getUserRanks(user.id).catch(() => []);
    const userAchievements = await getUserAchievements(user.id).catch(() => []);
    const mailInbox = await getUserMail(match.username, 'inbox').catch(() => []);
    const mailSent = await getUserMail(match.username, 'sent').catch(() => []);

    const ranks = {};
    for (const rank of userRanks) {
        if (rank?.job_type) {
            ranks[rank.job_type] = {
                level: rank.level,
                experience: rank.experience,
                next_level_xp: rank.next_level_xp,
                title: rank.title,
                stats: {
                    arrests_made: rank.arrests_made,
                    tickets_issued: rank.tickets_issued,
                    pursuits_completed: rank.pursuits_completed,
                    patients_treated: rank.patients_treated,
                    lives_saved: rank.lives_saved,
                    response_time_avg: rank.response_time_avg,
                    vehicles_repaired: rank.vehicles_repaired,
                    custom_jobs: rank.custom_jobs,
                    avg_repair_time: rank.avg_repair_time,
                    missions_completed: rank.missions_completed,
                    properties_owned: rank.properties_owned,
                    wealth_earned: rank.wealth_earned,
                    time_played: rank.time_played,
                    time_in_service: rank.time_in_service
                }
            };
        }
    }

    const achievements = userAchievements.map((entry) => entry.achievements || entry).filter(Boolean);

    return response(200, {
        username: match.username,
        player_name: user.player_name || match.username,
        gta_linked: !!user.gta_linked,
        created_from_game: !!user.created_from_game,
        created_at: user.created_at || null,
        global_stats: {
            total_playtime: user.total_playtime || 0,
            last_active: user.last_active || null,
            achievements_unlocked: user.achievements_unlocked || 0,
            total_achievements: user.total_achievements || 25
        },
        ranks,
        achievements,
        inbox: mailInbox,
        sent: mailSent
    });
};
