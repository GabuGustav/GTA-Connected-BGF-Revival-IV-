const fs = require('fs');
const path = require('path');

// Data storage (in production, use a real database)
const dataFile = path.join(__dirname, '..', '..', 'data.json');

function loadData() {
    if (fs.existsSync(dataFile)) {
        return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    }
    return {};
}

function saveData(data) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function normalizeUsername(value) {
    return String(value || '').toLowerCase().trim();
}

function calculateLevel(experience) {
    if (experience < 100) {
        return 1;
    }
    
    const level = Math.floor(Math.log2(experience / 100)) + 2;
    return level;
}

function calculateNextLevelXP(level) {
    if (level <= 1) {
        return 100;
    }
    return 100 * Math.pow(2, level - 1);
}

function getTitleForLevel(level, jobType) {
    const titles = {
        police: ['Recruit', 'Officer', 'Sergeant', 'Lieutenant', 'Captain', 'Chief'],
        medic: ['Trainee Medic', 'Medic', 'Senior Medic', 'Paramedic', 'Emergency Coordinator', 'Chief Medic'],
        mechanic: ['Apprentice Mechanic', 'Mechanic', 'Senior Mechanic', 'Master Mechanic', 'Shop Foreman', 'Chief Engineer'],
        civilian: ['Newcomer', 'Resident', 'Citizen', 'Community Leader', 'Local Hero', 'Civilian Legend']
    };
    
    const jobTitles = titles[jobType] || titles.civilian;
    const index = Math.min(level - 1, jobTitles.length - 1);
    return jobTitles[index];
}

exports.handler = async function(event) {
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
    
    // Only accept POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    
    try {
        // Parse and validate request
        const { playerUpdates } = JSON.parse(event.body);
        
        if (!Array.isArray(playerUpdates)) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ error: 'playerUpdates must be an array' })
            };
        }
        
        const data = loadData();
        let updatedCount = 0;
        
        // Process each player update
        for (const update of playerUpdates) {
            const { username, jobType, experience, stats, newLevel } = update;
            
            if (!username || !jobType || experience === undefined) {
                console.log('Skipping invalid update:', update);
                continue;
            }
            
            const normalizedUsername = normalizeUsername(username);
            
            // Create user if doesn't exist
            if (!data[normalizedUsername]) {
                data[normalizedUsername] = {
                    created_at: new Date().toISOString(),
                    gta_linked: true,
                    created_from_game: true,
                    inbox: [],
                    sent: [],
                    achievements: [],
                    ranks: {},
                    global_stats: {
                        total_playtime: 0,
                        last_active: new Date().toISOString(),
                        achievements_unlocked: 0,
                        total_achievements: 25
                    }
                };
                
                // Add welcome message
                data[normalizedUsername].inbox.push({
                    from: 'system',
                    subject: 'Welcome to BGF Revival IV!',
                    message: `Welcome ${username}! Your account has been created from the GTA server. Start playing to build your rank and unlock achievements!`,
                    date: new Date().toISOString(),
                    read: false
                });
            }
            
            const user = data[normalizedUsername];
            
            // Initialize ranks if needed
            if (!user.ranks) {
                user.ranks = {};
            }
            
            // Initialize global_stats if needed
            if (!user.global_stats) {
                user.global_stats = {
                    total_playtime: 0,
                    last_active: new Date().toISOString(),
                    achievements_unlocked: 0,
                    total_achievements: 25
                };
            }
            
            // Update rank data
            if (!user.ranks[jobType]) {
                user.ranks[jobType] = {
                    level: 1,
                    experience: 0,
                    next_level_xp: 100,
                    title: getTitleForLevel(1, jobType),
                    stats: {}
                };
            }
            
            // Update experience and level
            user.ranks[jobType].experience = experience;
            user.ranks[jobType].level = newLevel || calculateLevel(experience);
            user.ranks[jobType].next_level_xp = calculateNextLevelXP(user.ranks[jobType].level);
            user.ranks[jobType].title = getTitleForLevel(user.ranks[jobType].level, jobType);
            
            // Update stats
            if (stats && typeof stats === 'object') {
                user.ranks[jobType].stats = { ...user.ranks[jobType].stats, ...stats };
                
                // Update global playtime if time_played is provided
                if (stats.time_played) {
                    user.global_stats.total_playtime = Math.max(user.global_stats.total_playtime, stats.time_played);
                }
            }
            
            // Update last active
            user.global_stats.last_active = new Date().toISOString();
            
            updatedCount++;
        }
        
        // Save updated data
        saveData(data);
        
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({
                success: true,
                updated: updatedCount,
                total: playerUpdates.length,
                message: `Successfully updated ${updatedCount} players`
            })
        };
        
    } catch (error) {
        console.error('Batch sync error:', error);
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
