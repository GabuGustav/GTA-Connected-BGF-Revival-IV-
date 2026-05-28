// Supabase Client Configuration for BGF Revival IV
// This replaces the file-based data.json storage system

// Load environment variables from .env file
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);
const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseKey) : null;

function assertSupabaseConfigured() {
    if (!supabase) {
        throw new Error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }

    return supabase;
}

// User management functions
async function createUser(userData) {
    const client = assertSupabaseConfigured();
    const { data, error } = await client
        .from('users')
        .insert([{
            username: userData.username,
            password_hash: userData.password_hash,
            player_name: userData.player_name,
            gta_account_id: userData.gta_account_id,
            gta_linked: userData.gta_linked || false,
            created_from_game: userData.created_from_game || false,
            total_playtime: userData.total_playtime || 0,
            achievements_unlocked: userData.achievements_unlocked || 0,
            total_achievements: userData.total_achievements || 25
        }])
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

async function findUserByIdentifier(identifier) {
    const client = assertSupabaseConfigured();
    const normalized = String(identifier || '').toLowerCase().trim();
    if (!normalized) {
        return null;
    }
    
    // Try username first
    let { data, error } = await client
        .from('users')
        .select('*')
        .eq('username', normalized)
        .single();
    
    if (!error && data) return data;
    
    // Try player_name
    ({ data, error } = await client
        .from('users')
        .select('*')
        .eq('player_name', identifier)
        .single());
    
    if (!error && data) return data;
    
    // Try gta_account_id
    ({ data, error } = await client
        .from('users')
        .select('*')
        .eq('gta_account_id', identifier)
        .single());
    
    if (!error && data) return data;
    
    return null;
}

async function updateUserPassword(username, passwordHash) {
    const client = assertSupabaseConfigured();
    const normalized = String(username || '').toLowerCase().trim();
    const { data, error } = await client
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('username', normalized)
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function updateUserRank(userId, jobType, rankData) {
    const client = assertSupabaseConfigured();
    const { data, error } = await client
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
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

async function getUserRanks(userId) {
    const client = assertSupabaseConfigured();
    const { data, error } = await client
        .from('user_ranks')
        .select('*')
        .eq('user_id', userId);
    
    if (error) throw error;
    return data;
}

async function getUserAchievements(userId) {
    const client = assertSupabaseConfigured();
    const { data, error } = await client
        .from('user_achievements')
        .select(`
            *,
            achievements (*)
        `)
        .eq('user_id', userId);
    
    if (error) throw error;
    return data;
}

async function sendMailMessage(mailData) {
    const client = assertSupabaseConfigured();
    const message = {
        from_username: mailData.from,
        to_username: mailData.to,
        subject: mailData.subject,
        message: mailData.message,
        read_status: false,
        message_type: 'inbox'
    };
    
    // Add to recipient's inbox
    const { data: inboxData, error: inboxError } = await client
        .from('mail_messages')
        .insert([message])
        .select()
        .single();
    
    if (inboxError) throw inboxError;
    
    // Add to sender's sent items
    const { data: sentData, error: sentError } = await client
        .from('mail_messages')
        .insert([{
            ...message,
            message_type: 'sent',
            to_username: mailData.to
        }])
        .select()
        .single();
    
    if (sentError) throw sentError;
    
    return { inbox: inboxData, sent: sentData };
}

async function getUserMail(username, messageType = 'inbox') {
    const client = assertSupabaseConfigured();
    const { data, error } = await client
        .from('mail_messages')
        .select('*')
        .eq(messageType === 'inbox' ? 'to_username' : 'from_username', username)
        .eq('message_type', messageType)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

async function markMailAsRead(messageId) {
    const client = assertSupabaseConfigured();
    const { data, error } = await client
        .from('mail_messages')
        .update({ read_status: true })
        .eq('id', messageId)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

async function getLeaderboard(jobType, limit = 50, offset = 0) {
    const client = assertSupabaseConfigured();
    const { data, error } = await client
        .from('user_ranks')
        .select(`
            *,
            users!inner (
                username,
                player_name,
                gta_account_id
            )
        `)
        .eq('job_type', jobType)
        .order('experience', { ascending: false })
        .range(offset, offset + limit - 1);
    
    if (error) throw error;
    return data;
}

async function updateUserGlobalStats(userId, stats) {
    const client = assertSupabaseConfigured();
    const { data, error } = await client
        .from('users')
        .update({
            total_playtime: stats.total_playtime,
            achievements_unlocked: stats.achievements_unlocked,
            last_active: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

async function createPasswordResetRequest({ id, username, otpCode, expiresAt }) {
    const client = assertSupabaseConfigured();
    const { data, error } = await client
        .from('password_resets')
        .insert([{
            id,
            username,
            otp_code: otpCode,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function getPasswordResetRequest(otpId) {
    const client = assertSupabaseConfigured();
    const { data, error } = await client
        .from('password_resets')
        .select('*')
        .eq('id', otpId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        throw error;
    }

    return data;
}

async function markPasswordResetVerified(otpId, resetToken) {
    const client = assertSupabaseConfigured();
    const { data, error } = await client
        .from('password_resets')
        .update({
            reset_token: resetToken,
            verified_at: new Date().toISOString()
        })
        .eq('id', otpId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function consumePasswordResetToken(resetToken, newPasswordHash) {
    const client = assertSupabaseConfigured();
    const { data: resetRequest, error: resetError } = await client
        .from('password_resets')
        .select('*')
        .eq('reset_token', resetToken)
        .is('consumed_at', null)
        .single();

    if (resetError) {
        if (resetError.code === 'PGRST116') {
            return null;
        }
        throw resetError;
    }

    if (!resetRequest) {
        return null;
    }

    const expiresAt = new Date(resetRequest.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || new Date() > expiresAt) {
        return null;
    }

    const updatedUser = await updateUserPassword(resetRequest.username, newPasswordHash);

    const { error: consumeError } = await client
        .from('password_resets')
        .update({
            consumed_at: new Date().toISOString()
        })
        .eq('id', resetRequest.id);

    if (consumeError) throw consumeError;
    return updatedUser;
}

module.exports = {
    supabase,
    hasSupabaseConfig,
    assertSupabaseConfigured,
    createUser,
    findUserByIdentifier,
    updateUserPassword,
    updateUserRank,
    getUserRanks,
    getUserAchievements,
    sendMailMessage,
    getUserMail,
    markMailAsRead,
    getLeaderboard,
    updateUserGlobalStats,
    createPasswordResetRequest,
    getPasswordResetRequest,
    markPasswordResetVerified,
    consumePasswordResetToken
};
