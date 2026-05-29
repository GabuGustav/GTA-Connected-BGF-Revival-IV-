const {
    extractSessionFromRequest,
    isSecureRequest,
    buildSessionCookie
} = require('../../session-auth');
const {
    findUserByIdentifier,
    getUserMail,
    getUserRanks,
    getUserAchievements
} = require('../../supabase-client');

function response(statusCode, body, extraHeaders = {}) {
    return {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Content-Type': 'application/json',
            ...extraHeaders
        },
        body: JSON.stringify(body)
    };
}

function buildUserProfile(match, user, inbox, sent, ranksRows, achievementRows) {
    const ranks = {};
    for (const rank of ranksRows || []) {
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

    const achievements = (achievementRows || []).map((entry) => entry.achievements || entry).filter(Boolean);

    return {
        username: match.username,
        playerName: user.player_name || match.username,
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
        inbox,
        sent
    };
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return response(200, {});
    }

    if (event.httpMethod !== 'GET') {
        return response(405, { error: 'Method not allowed' });
    }

    try {
        const session = extractSessionFromRequest(event);
        if (!session) {
            return response(401, { error: 'No active session' });
        }

        const match = await findUserByIdentifier(session.username);
        if (!match) {
            return response(404, { error: 'User not found' });
        }

        const [inbox, sent, ranksRows, achievementRows] = await Promise.all([
            getUserMail(match.username, 'inbox').catch(() => []),
            getUserMail(match.username, 'sent').catch(() => []),
            getUserRanks(match.user.id).catch(() => []),
            getUserAchievements(match.user.id).catch(() => [])
        ]);

        const refreshedToken = buildSessionCookie(
            require('../../session-auth').createSessionToken(match.username, session.remember),
            session.remember,
            isSecureRequest(event)
        );

        return response(200, {
            success: true,
            user: buildUserProfile(match, match.user, inbox, sent, ranksRows, achievementRows)
        }, {
            'Set-Cookie': refreshedToken
        });
    } catch (error) {
        return response(500, { error: 'Internal server error', message: error.message });
    }
};
