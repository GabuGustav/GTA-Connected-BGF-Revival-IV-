import { jsonResponse } from '../lib/cf-http.js';
import { cfFindUserByIdentifier, cfGetUserAchievements } from '../lib/cf-supabase-rest.js';

export async function onRequest(context) {
    const { request, env, params } = context;
    const accountId = params.accountId;

    try {
        if (request.method !== 'GET') {
            return jsonResponse(request, 405, { error: 'Method not allowed' });
        }

        if (!accountId) {
            return jsonResponse(request, 400, { error: 'Account ID required' });
        }

        const user = await cfFindUserByIdentifier(env, accountId);
        if (!user) {
            return jsonResponse(request, 404, { error: 'User not found' });
        }

        const achievementsRows = await cfGetUserAchievements(env, user.id).catch(() => []);
        const achievements = achievementsRows
            .map((entry) => entry.achievements || entry)
            .filter(Boolean);

        return jsonResponse(request, 200, {
            username: user.username,
            playerName: user.player_name || user.username,
            achievements,
            totalAchievements: user.total_achievements || 25,
            unlockedAchievements: user.achievements_unlocked || 0
        });
    } catch (error) {
        console.error('player-achievements:', error);
        return jsonResponse(request, 500, {
            error: 'Internal server error',
            message: error.message
        });
    }
}
