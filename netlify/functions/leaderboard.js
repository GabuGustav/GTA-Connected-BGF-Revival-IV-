const crypto = require('crypto');

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

    // Validate HTTP method
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Extract jobType: prefer ?job= query param (Netlify), fall back to last path segment (local dev)
    const queryParams = event.queryStringParameters || {};
    const pathParts = (event.path || '').split('/');
    const pathJobType = pathParts[pathParts.length - 1];
    const jobType = queryParams.job || (pathJobType !== 'leaderboard' ? pathJobType : null);
    const { limit = 50, offset = 0 } = queryParams;

    if (!jobType) {
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ error: 'Job type required. Pass ?job=police|medic|mechanic|civilian' })
        };
    }

    try {
        let getLeaderboard;
        try {
            ({ getLeaderboard } = require('../../supabase-client'));
        } catch (initError) {
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({
                    error: 'Leaderboard backend misconfigured',
                    message: 'Supabase environment variables are missing or invalid on the server',
                    details: initError.message
                })
            };
        }

        // Verify HMAC signature if provided
        const providedSignature = event.headers['x-bgf-signature'];
        if (providedSignature) {
            const payload = JSON.stringify(event.queryStringParameters);
            const API_SECRET = process.env.API_SECRET_KEY || 'default-secret-key-change-in-production';

            const hmac = crypto.createHmac('sha256', API_SECRET);
            hmac.update(payload);
            const expectedSignature = hmac.digest('hex');

            if (!crypto.timingSafeEqual(Buffer.from(providedSignature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
                return {
                    statusCode: 401,
                    headers: headers,
                    body: JSON.stringify({ error: 'Invalid signature' })
                };
            }
        }

        // Get leaderboard from Supabase
        const leaderboardData = await getLeaderboard(jobType, parseInt(limit), parseInt(offset));

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({
                success: true,
                jobType: jobType,
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: leaderboardData.length,
                players: leaderboardData.map(player => ({
                    username: player.users.username,
                    playerName: player.users.player_name,
                    gtaAccountId: player.users.gta_account_id,
                    rank: {
                        level: player.level,
                        experience: player.experience,
                        nextLevelXp: player.next_level_xp,
                        title: player.title,
                        stats: {
                            arrests_made: player.arrests_made,
                            tickets_issued: player.tickets_issued,
                            pursuits_completed: player.pursuits_completed,
                            patients_treated: player.patients_treated,
                            lives_saved: player.lives_saved,
                            response_time_avg: player.response_time_avg,
                            vehicles_repaired: player.vehicles_repaired,
                            custom_jobs: player.custom_jobs,
                            avg_repair_time: player.avg_repair_time,
                            missions_completed: player.missions_completed,
                            properties_owned: player.properties_owned,
                            wealth_earned: player.wealth_earned,
                            time_played: player.time_played,
                            time_in_service: player.time_in_service
                        }
                    }
                }))
            })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};
