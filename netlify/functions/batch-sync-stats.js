const {
    response,
    corsPreflight,
    parseBridgePayload,
    authenticateGtaBridge,
    normalizeUsername,
    calculateLevel,
    calculateNextLevelXP,
    getTitleForLevel,
    mapStatsToRankColumns
} = require('./_gta_bridge');
const {
    hasSupabaseConfig,
    ensureUserForGameSync,
    updateUserRank,
    updateUserGlobalStats
} = require('../../supabase-client');

const VALID_JOB_TYPES = new Set(['police', 'medic', 'mechanic', 'civilian']);
const MAX_BATCH_UPDATES = 100;

exports.handler = async function(event) {
    if (event.httpMethod === 'OPTIONS') {
        return corsPreflight();
    }

    if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
        return response(405, { error: 'Method not allowed' });
    }

    const auth = authenticateGtaBridge(event);
    if (!auth.ok) {
        return response(401, { error: auth.error });
    }

    if (!hasSupabaseConfig) {
        return response(503, { error: 'Supabase is not configured on this deployment' });
    }

    try {
        const payload = parseBridgePayload(event);
        if (!payload || !Array.isArray(payload.playerUpdates)) {
            return response(400, { error: 'playerUpdates must be an array' });
        }

        const { playerUpdates } = payload;
        if (playerUpdates.length > MAX_BATCH_UPDATES) {
            return response(400, { error: `Too many updates in one request (max ${MAX_BATCH_UPDATES})` });
        }

        let updatedCount = 0;
        const errors = [];

        for (const update of playerUpdates) {
            const { username, jobType, stats, experience, newLevel } = update;

            if (!username || !jobType) {
                errors.push({ username, error: 'Missing username or jobType' });
                continue;
            }

            const normalizedJob = String(jobType).toLowerCase();
            if (!VALID_JOB_TYPES.has(normalizedJob)) {
                errors.push({ username, error: `Invalid job type: ${jobType}` });
                continue;
            }

            const normalizedUsername = normalizeUsername(username);
            if (!normalizedUsername) {
                errors.push({ username, error: 'Invalid username' });
                continue;
            }

            try {
                const user = await ensureUserForGameSync(
                    normalizedUsername,
                    update.playerName || normalizedUsername
                );

                const xp = experience !== undefined ? Number(experience) : 0;
                const level = newLevel !== undefined ? Number(newLevel) : calculateLevel(xp);
                const statColumns = mapStatsToRankColumns(stats);

                await updateUserRank(user.id, normalizedJob, {
                    level,
                    experience: xp,
                    next_level_xp: calculateNextLevelXP(level),
                    title: getTitleForLevel(level, normalizedJob),
                    stats: statColumns
                });

                const playtime = statColumns.time_played || statColumns.time_in_service || 0;
                if (playtime > 0) {
                    await updateUserGlobalStats(user.id, {
                        total_playtime: Math.max(user.total_playtime || 0, playtime),
                        achievements_unlocked: user.achievements_unlocked || 0
                    });
                }

                updatedCount += 1;
            } catch (syncError) {
                errors.push({ username: normalizedUsername, error: syncError.message });
            }
        }

        return response(200, {
            success: true,
            updated: updatedCount,
            updatedCount,
            total: playerUpdates.length,
            errors,
            message: `Successfully updated ${updatedCount} players in Supabase`
        });
    } catch (error) {
        console.error('Batch sync error:', error);
        return response(500, {
            error: 'Internal server error',
            message: error.message
        });
    }
};
