const JOB_TYPES = ['police', 'medic', 'mechanic', 'civilian'];

const TITLES = {
    police: ['Recruit', 'Officer', 'Sergeant', 'Lieutenant', 'Captain', 'Chief'],
    medic: ['Trainee Medic', 'Medic', 'Senior Medic', 'Paramedic', 'Emergency Coordinator', 'Chief Medic'],
    mechanic: ['Apprentice Mechanic', 'Mechanic', 'Senior Mechanic', 'Master Mechanic', 'Shop Foreman', 'Chief Engineer'],
    civilian: ['Newcomer', 'Resident', 'Citizen', 'Community Leader', 'Local Hero', 'Civilian Legend']
};

function response(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Signature, X-Timestamp',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}

function corsPreflight() {
    return response(200, {});
}

function parseBridgePayload(event) {
    const query = event.queryStringParameters || {};

    if (query.payload) {
        try {
            return JSON.parse(query.payload);
        } catch (_) {
            return null;
        }
    }

    if (!event.body) {
        return null;
    }

    try {
        return JSON.parse(event.body);
    } catch (_) {
        return null;
    }
}

function authenticateGtaBridge(event) {
    const expectedKey = process.env.API_SECRET_KEY || process.env.GTA_API_KEY || 'gta-server-api-key';
    const query = event.queryStringParameters || {};
    const providedKey = query.api_key || query.apiKey;

    if (!providedKey || providedKey !== expectedKey) {
        return { ok: false, error: 'Invalid bridge API key' };
    }

    return { ok: true };
}

function normalizeUsername(value) {
    return String(value || '').toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
}

function validateUsername(normalized) {
    if (!normalized || normalized.length < 3 || normalized.length > 24) {
        return 'Username must be 3-24 characters (letters, numbers, underscore)';
    }
    return null;
}

function calculateLevel(experience) {
    const xp = Number(experience) || 0;
    if (xp < 100) {
        return 1;
    }
    return Math.floor(Math.log2(xp / 100)) + 2;
}

function calculateNextLevelXP(level) {
    const lv = Number(level) || 1;
    if (lv <= 1) {
        return 100;
    }
    return 100 * Math.pow(2, lv - 1);
}

function getTitleForLevel(level, jobType) {
    const jobTitles = TITLES[jobType] || TITLES.civilian;
    const index = Math.min(Math.max(Number(level) || 1, 1) - 1, jobTitles.length - 1);
    return jobTitles[index];
}

function mapStatsToRankColumns(stats) {
    const s = stats && typeof stats === 'object' ? stats : {};
    return {
        arrests_made: s.arrests_made || 0,
        tickets_issued: s.tickets_issued || 0,
        pursuits_completed: s.pursuits_completed || 0,
        patients_treated: s.patients_treated || 0,
        lives_saved: s.lives_saved || 0,
        response_time_avg: s.response_time_avg || 0,
        vehicles_repaired: s.vehicles_repaired || 0,
        custom_jobs: s.custom_jobs || 0,
        avg_repair_time: s.avg_repair_time || 0,
        missions_completed: s.missions_completed || 0,
        properties_owned: s.properties_owned || 0,
        wealth_earned: s.wealth_earned || 0,
        time_played: s.time_played || 0,
        time_in_service: s.time_in_service || 0
    };
}

module.exports = {
    JOB_TYPES,
    response,
    corsPreflight,
    parseBridgePayload,
    authenticateGtaBridge,
    normalizeUsername,
    validateUsername,
    calculateLevel,
    calculateNextLevelXP,
    getTitleForLevel,
    mapStatsToRankColumns
};
