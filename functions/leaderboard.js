import { jsonResponse } from './lib/cf-http.js';
import { cfGetLeaderboard } from './lib/cf-supabase-rest.js';

export async function onRequest(context) {
    const { request, env } = context;

    try {
        if (request.method !== 'GET') {
            return jsonResponse(request, 405, { error: 'Method not allowed' });
        }

        const url = new URL(request.url);
        const jobType = url.searchParams.get('job');
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);

        if (!jobType) {
            return jsonResponse(request, 400, {
                error: 'Job type required. Pass ?job=police|medic|mechanic|civilian'
            });
        }

        const leaderboardData = await cfGetLeaderboard(env, jobType, limit, offset);

        return jsonResponse(request, 200, {
            success: true,
            jobType,
            limit,
            offset,
            total: leaderboardData.length,
            players: leaderboardData.map((player) => ({
                username: player.users?.username || 'unknown',
                playerName: player.users?.player_name || player.users?.username || 'Unknown',
                gtaAccountId: player.users?.gta_account_id || null,
                rank: {
                    level: player.level || 0,
                    experience: player.experience || 0,
                    nextLevelXp: player.next_level_xp || 0,
                    title: player.title || '',
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
        });
    } catch (error) {
        console.error('leaderboard:', error);
        return jsonResponse(request, 500, {
            error: 'Internal server error',
            message: error.message
        });
    }
}
