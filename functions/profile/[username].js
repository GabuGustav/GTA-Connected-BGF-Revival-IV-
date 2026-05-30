import { jsonResponse } from '../lib/cf-http.js';
import {
    cfFindUserByIdentifier,
    cfGetUserRanks,
    cfGetUserAchievements,
    cfGetUserMail,
    mapRankStats
} from '../lib/cf-supabase-rest.js';

export async function onRequest(context) {
    const { request, env, params } = context;
    const username = params.username;

    try {
        if (request.method !== 'GET') {
            return jsonResponse(request, 405, { error: 'Method not allowed' });
        }

        if (!username) {
            return jsonResponse(request, 400, { error: 'Username required' });
        }

        const user = await cfFindUserByIdentifier(env, username);
        if (!user) {
            return jsonResponse(request, 404, { error: 'User not found' });
        }

        const [userRanks, userAchievements, mailInbox, mailSent] = await Promise.all([
            cfGetUserRanks(env, user.id).catch(() => []),
            cfGetUserAchievements(env, user.id).catch(() => []),
            cfGetUserMail(env, user.username, 'inbox').catch(() => []),
            cfGetUserMail(env, user.username, 'sent').catch(() => [])
        ]);

        const ranks = {};
        for (const rank of userRanks) {
            if (rank?.job_type) {
                ranks[rank.job_type] = mapRankStats(rank);
            }
        }

        const achievements = userAchievements
            .map((entry) => entry.achievements || entry)
            .filter(Boolean);

        return jsonResponse(request, 200, {
            username: user.username,
            player_name: user.player_name || user.username,
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
    } catch (error) {
        console.error('profile:', error);
        return jsonResponse(request, 500, {
            error: 'Profile backend misconfigured',
            message: error.message
        });
    }
}
