const { loadData, findUserByIdentifier, response } = require('./_jobs_data');

exports.handler = async (event) => {
    const pathParts = event.path.split('/');
    const accountId = pathParts[pathParts.length - 1];

    if (!accountId || accountId === 'player-achievements') {
        return response(400, { error: 'Account ID required' });
    }

    const users = loadData();
    const match = findUserByIdentifier(users, accountId);

    if (!match) {
        return response(404, { error: 'User not found' });
    }

    const normalizedUsername = match.username;
    const user = match.user;

    return response(200, {
        username: normalizedUsername,
        playerName: user.player_name || normalizedUsername,
        achievements: user.achievements || [],
        totalAchievements: user.global_stats?.total_achievements || 25,
        unlockedAchievements: user.global_stats?.achievements_unlocked || 0
    });
};
