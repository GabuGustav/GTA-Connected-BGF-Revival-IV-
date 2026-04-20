// Real-time GTA Server → Supabase Sync System
// This monitors local data.json and syncs changes to Supabase instantly
// GTA server keeps using local JSON, website gets real-time updates

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Local data paths
const dataFile = path.join(__dirname, 'data.json');
const lastSyncFile = path.join(__dirname, '.last-sync.json');

// Track last sync to avoid unnecessary updates
let lastSyncData = {};

function loadLastSyncData() {
    if (fs.existsSync(lastSyncFile)) {
        return JSON.parse(fs.readFileSync(lastSyncFile, 'utf8'));
    }
    return {};
}

function saveLastSyncData(data) {
    fs.writeFileSync(lastSyncFile, JSON.stringify(data, null, 2));
}

function loadLocalData() {
    if (fs.existsSync(dataFile)) {
        return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    }
    return {};
}

// Sync user to Supabase
async function syncUserToSupabase(username, userData) {
    try {
        console.log(`Syncing user: ${username}`);
        
        // Check if user exists in Supabase
        const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('id, username')
            .eq('username', username)
            .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }
        
        let userId;
        
        if (existingUser) {
            // Update existing user
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    player_name: userData.player_name,
                    gta_account_id: userData.gta_account_id,
                    gta_linked: userData.gta_linked || false,
                    total_playtime: userData.global_stats?.total_playtime || 0,
                    achievements_unlocked: userData.global_stats?.achievements_unlocked || 0,
                    total_achievements: userData.global_stats?.total_achievements || 25,
                    last_active: new Date().toISOString()
                })
                .eq('username', username);
            
            if (updateError) throw updateError;
            userId = existingUser.id;
            
            console.log(`  Updated user: ${username}`);
        } else {
            // Create new user
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([{
                    username: username,
                    password_hash: userData.password,
                    player_name: userData.player_name,
                    gta_account_id: userData.gta_account_id,
                    gta_linked: userData.gta_linked || false,
                    created_from_game: true,
                    total_playtime: userData.global_stats?.total_playtime || 0,
                    achievements_unlocked: userData.global_stats?.achievements_unlocked || 0,
                    total_achievements: userData.global_stats?.total_achievements || 25
                }])
                .select()
                .single();
            
            if (createError) throw createError;
            userId = newUser.id;
            
            console.log(`  Created user: ${username}`);
        }
        
        // Sync ranks
        if (userData.ranks) {
            for (const [jobType, rankData] of Object.entries(userData.ranks)) {
                const { error: rankError } = await supabase
                    .from('user_ranks')
                    .upsert([{
                        user_id: userId,
                        job_type: jobType,
                        level: rankData.level,
                        experience: rankData.experience,
                        next_level_xp: rankData.next_level_xp,
                        title: rankData.title,
                        arrests_made: rankData.stats?.arrests_made || 0,
                        tickets_issued: rankData.stats?.tickets_issued || 0,
                        pursuits_completed: rankData.stats?.pursuits_completed || 0,
                        patients_treated: rankData.stats?.patients_treated || 0,
                        lives_saved: rankData.stats?.lives_saved || 0,
                        response_time_avg: rankData.stats?.response_time_avg || 0,
                        vehicles_repaired: rankData.stats?.vehicles_repaired || 0,
                        custom_jobs: rankData.stats?.custom_jobs || 0,
                        avg_repair_time: rankData.stats?.avg_repair_time || 0,
                        missions_completed: rankData.stats?.missions_completed || 0,
                        properties_owned: rankData.stats?.properties_owned || 0,
                        wealth_earned: rankData.stats?.wealth_earned || 0,
                        time_played: rankData.stats?.time_played || 0,
                        time_in_service: rankData.stats?.time_in_service || 0,
                        updated_at: new Date().toISOString()
                    }])
                    .eq('user_id', userId)
                    .eq('job_type', jobType);
                
                if (rankError) throw rankError;
                console.log(`  Synced rank: ${jobType} level ${rankData.level}`);
            }
        }
        
        // Sync mail
        if (userData.inbox && userData.inbox.length > 0) {
            for (const mail of userData.inbox) {
                const { error: mailError } = await supabase
                    .from('mail_messages')
                    .upsert([{
                        from_username: mail.from,
                        to_username: username,
                        subject: mail.subject,
                        message: mail.message,
                        read_status: mail.read || false,
                        message_type: 'inbox',
                        created_at: mail.date ? new Date(mail.date).toISOString() : new Date().toISOString()
                    }], {
                        onConflict: 'from_username,to_username,subject,created_at'
                    });
                
                if (mailError) console.error(`  Mail sync error:`, mailError.message);
            }
            console.log(`  Synced ${userData.inbox.length} inbox messages`);
        }
        
        return true;
        
    } catch (error) {
        console.error(`  Error syncing user ${username}:`, error.message);
        return false;
    }
}

// Check if user data has changed
function hasUserDataChanged(username, userData, lastSync) {
    const lastUserSync = lastSync[username];
    if (!lastUserSync) return true;
    
    // Simple hash comparison for quick change detection
    const currentHash = JSON.stringify(userData);
    return currentHash !== lastUserSync.hash;
}

// Main sync function
async function syncAllUsers() {
    console.log('=== Starting Real-time Sync ===');
    
    try {
        const localData = loadLocalData();
        const lastSync = loadLastSyncData();
        let syncCount = 0;
        let errorCount = 0;
        
        for (const [username, userData] of Object.entries(localData)) {
            if (hasUserDataChanged(username, userData, lastSync)) {
                const success = await syncUserToSupabase(username, userData);
                if (success) {
                    syncCount++;
                    // Update last sync hash
                    lastSync[username] = {
                        hash: JSON.stringify(userData),
                        syncedAt: new Date().toISOString()
                    };
                } else {
                    errorCount++;
                }
            }
        }
        
        // Save sync state
        saveLastSyncData(lastSync);
        
        console.log(`=== Sync Complete ===`);
        console.log(`Users synced: ${syncCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log(`Total users: ${Object.keys(localData).length}\n`);
        
        return { syncCount, errorCount, total: Object.keys(localData).length };
        
    } catch (error) {
        console.error('Sync failed:', error);
        return { syncCount: 0, errorCount: 1, total: 0 };
    }
}

// Watch for file changes (optional - for real-time sync)
function startFileWatcher() {
    if (fs.existsSync(dataFile)) {
        console.log('👀 Starting file watcher for real-time sync...');
        
        fs.watchFile(dataFile, async (eventType, filename) => {
            if (eventType === 'change') {
                console.log('📝 data.json changed, syncing to Supabase...');
                await syncAllUsers();
            }
        });
    }
}

// CLI interface
const args = process.argv.slice(2);

if (args.includes('--watch') || args.includes('-w')) {
    // Start with file watcher for real-time sync
    syncAllUsers().then(() => {
        startFileWatcher();
        console.log('🔄 Real-time sync active. Press Ctrl+C to stop.');
    });
} else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Real-time GTA Server → Supabase Sync

Usage:
  node sync-gta-to-supabase.js [options]

Options:
  --watch, -w    Watch data.json for changes and sync automatically
  --help, -h     Show this help message

Examples:
  node sync-gta-to-supabase.js              # One-time sync
  node sync-gta-to-supabase.js --watch       # Real-time sync

This allows your GTA server to keep using local JSON files
while automatically syncing all changes to Supabase for the website.
    `);
} else {
    // One-time sync
    syncAllUsers();
}

module.exports = { syncAllUsers, syncUserToSupabase };
