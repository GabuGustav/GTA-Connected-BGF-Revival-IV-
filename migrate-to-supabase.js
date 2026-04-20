// Migration Script: data.json to Supabase
// This script migrates all existing user data from data.json to Supabase

const fs = require('fs');
const path = require('path');
const { 
    createUser, 
    updateUserRank, 
    sendMailMessage,
    getUserAchievements 
} = require('./supabase-client');

// Load existing data from data.json
function loadDataFromJson() {
    const dataFile = path.join(__dirname, 'data.json');
    if (fs.existsSync(dataFile)) {
        return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    }
    return {};
}

// Convert ranks data to Supabase format
function convertRanksData(ranks) {
    const convertedRanks = [];
    
    for (const [jobType, rankData] of Object.entries(ranks)) {
        convertedRanks.push({
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
            time_in_service: rankData.stats?.time_in_service || 0
        });
    }
    
    return convertedRanks;
}

// Migrate a single user
async function migrateUser(username, userData) {
    try {
        console.log(`Migrating user: ${username}`);
        
        // Create user in Supabase
        const user = await createUser({
            username: username,
            password_hash: userData.password,
            player_name: userData.player_name,
            gta_account_id: userData.gta_account_id,
            gta_linked: userData.gta_linked || false,
            created_from_game: userData.created_from_game || false,
            total_playtime: userData.global_stats?.total_playtime || 0,
            achievements_unlocked: userData.global_stats?.achievements_unlocked || 0,
            total_achievements: userData.global_stats?.total_achievements || 25
        });
        
        console.log(`  Created user: ${user.id}`);
        
        // Migrate ranks
        if (userData.ranks) {
            const convertedRanks = convertRanksData(userData.ranks);
            
            for (const rankData of convertedRanks) {
                await updateUserRank(user.id, rankData.job_type, rankData);
                console.log(`  Added rank: ${rankData.job_type} level ${rankData.level}`);
            }
        }
        
        // Migrate mail
        if (userData.inbox && userData.inbox.length > 0) {
            for (const mail of userData.inbox) {
                await sendMailMessage({
                    from: mail.from,
                    to: username,
                    subject: mail.subject,
                    message: mail.message
                });
                console.log(`  Added inbox mail: ${mail.subject}`);
            }
        }
        
        if (userData.sent && userData.sent.length > 0) {
            for (const mail of userData.sent) {
                await sendMailMessage({
                    from: mail.from || username,
                    to: mail.to,
                    subject: mail.subject,
                    message: mail.message
                });
                console.log(`  Added sent mail: ${mail.subject}`);
            }
        }
        
        console.log(`  Successfully migrated user: ${username}\n`);
        return true;
        
    } catch (error) {
        console.error(`  Error migrating user ${username}:`, error.message);
        return false;
    }
}

// Main migration function
async function migrateAllUsers() {
    console.log('=== Starting Migration from data.json to Supabase ===\n');
    
    try {
        // Load existing data
        const existingData = loadDataFromJson();
        const userCount = Object.keys(existingData).length;
        
        console.log(`Found ${userCount} users to migrate\n`);
        
        let successCount = 0;
        let errorCount = 0;
        
        // Migrate each user
        for (const [username, userData] of Object.entries(existingData)) {
            const success = await migrateUser(username, userData);
            if (success) {
                successCount++;
            } else {
                errorCount++;
            }
        }
        
        console.log('=== Migration Complete ===');
        console.log(`Successfully migrated: ${successCount} users`);
        console.log(`Failed to migrate: ${errorCount} users`);
        console.log(`Total users processed: ${userCount}\n`);
        
        if (errorCount === 0) {
            console.log('Migration completed successfully!');
            console.log('You can now backup and remove data.json');
        } else {
            console.log('Some users failed to migrate. Check the errors above.');
        }
        
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

// Instructions for running this migration
console.log('=== Migration Instructions ===');
console.log('1. Set up your Supabase project and run the schema.sql');
console.log('2. Set environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
console.log('3. Run: node migrate-to-supabase.js');
console.log('4. After successful migration, backup data.json and remove it\n');

// Uncomment line below to run migration immediately
migrateAllUsers();

module.exports = { migrateAllUsers, migrateUser };
