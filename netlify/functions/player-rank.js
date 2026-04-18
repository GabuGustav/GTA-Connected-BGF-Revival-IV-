const { loadData, findUserByIdentifier, response } = require('./_jobs_data');

exports.handler = async (event) => {
    const pathParts = event.path.split('/');
    const jobType = pathParts[pathParts.length - 1];
    const accountId = pathParts[pathParts.length - 2];

    if (!accountId || !jobType || accountId === 'player-rank') {
        return response(400, { error: 'Account ID and job type required' });
    }

    const users = loadData();
    const match = findUserByIdentifier(users, accountId);

    if (!match) {
        return response(404, { error: 'User not found' });
    }

    const normalizedUsername = match.username;
    const user = match.user;

    const rankData = user.ranks && user.ranks[jobType];
    if (!rankData) {
        return response(404, { error: 'Job type not found' });
    }

    return response(200, {
        username: normalizedUsername,
        playerName: user.player_name || normalizedUsername,
        jobType,
        rank: rankData,
        globalStats: user.global_stats || {}
    });
};
