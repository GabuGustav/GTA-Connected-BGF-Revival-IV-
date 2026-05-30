import { jsonResponse } from '../../lib/cf-http.js';
import { cfFindUserByIdentifier, cfGetUserRanks, mapRankStats } from '../../lib/cf-supabase-rest.js';

export async function onRequest(context) {
    const { request, env, params } = context;
    const { accountId, jobType } = params;

    try {
        if (request.method !== 'GET') {
            return jsonResponse(request, 405, { error: 'Method not allowed' });
        }

        if (!accountId || !jobType) {
            return jsonResponse(request, 400, { error: 'Account ID and job type required' });
        }

        const user = await cfFindUserByIdentifier(env, accountId);
        if (!user) {
            return jsonResponse(request, 404, { error: 'User not found' });
        }

        const userRanks = await cfGetUserRanks(env, user.id).catch(() => []);
        const rankEntry = userRanks.find((entry) => entry.job_type === jobType);

        return jsonResponse(request, 200, {
            username: user.username,
            playerName: user.player_name || user.username,
            jobType,
            rank: mapRankStats(rankEntry),
            globalStats: {
                total_playtime: user.total_playtime || 0,
                last_active: user.last_active || null,
                achievements_unlocked: user.achievements_unlocked || 0,
                total_achievements: user.total_achievements || 25
            }
        });
    } catch (error) {
        console.error('player-rank:', error);
        return jsonResponse(request, 500, {
            error: 'Internal server error',
            message: error.message
        });
    }
}
