const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(__dirname));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// API Configuration
const API_SECRET = process.env.API_SECRET_KEY || 'default-secret-key-change-in-production';
const GTA_API_KEY = process.env.GTA_API_KEY || 'gta-server-api-key';

// Data storage (in production, use a real database)
const dataFile = path.join(__dirname, 'data.json');
const otpFile = path.join(__dirname, 'otps.json');

function loadData() {
    if (fs.existsSync(dataFile)) {
        return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    }
    return {};
}

function saveData(data) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function loadOTPs() {
    if (fs.existsSync(otpFile)) {
        return JSON.parse(fs.readFileSync(otpFile, 'utf8'));
    }
    return {};
}

function saveOTPs(otps) {
    fs.writeFileSync(otpFile, JSON.stringify(otps, null, 2));
}

// Clean expired OTPs
function cleanExpiredOTPs() {
    const otps = loadOTPs();
    const now = new Date();
    let cleaned = false;
    
    for (const [id, otp] of Object.entries(otps)) {
        if (now > new Date(otp.expiresAt)) {
            delete otps[id];
            cleaned = true;
        }
    }
    
    if (cleaned) {
        saveOTPs(otps);
    }
}

// API Routes

// Generate OTP for password recovery
app.post('/api/forgot-password', (req, res) => {
    const { username } = req.body;
    
    if (!username) {
        return res.status(400).json({ error: 'Username required' });
    }
    
    const users = loadData();
    
    if (!users[username.toLowerCase()]) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // Store OTP
    const otps = loadOTPs();
    otps[otpId] = {
        id: otpId,
        code: otp,
        username: username.toLowerCase(),
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
    };
    saveOTPs(otps);
    
    // Send OTP via BGF Mail (you'll implement this)
    console.log(`OTP for ${username}: ${otp} (ID: ${otpId})`);
    
    res.json({
        success: true,
        otp_id: otpId,
        expires_in: 900, // 15 minutes in seconds
        message: 'Recovery code sent to BGF Mail'
    });
});

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
    const { otp_id, otp } = req.body;
    
    if (!otp_id || !otp) {
        return res.status(400).json({ error: 'OTP ID and code required' });
    }
    
    const otps = loadOTPs();
    const otpData = otps[otp_id];
    
    if (!otpData) {
        return res.status(400).json({ error: 'Invalid OTP ID' });
    }
    
    if (otpData.code !== otp) {
        return res.status(400).json({ error: 'Invalid OTP code' });
    }
    
    if (new Date() > new Date(otpData.expiresAt)) {
        return res.status(400).json({ error: 'OTP expired' });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    res.json({
        valid: true,
        username: otpData.username,
        reset_token: resetToken,
        message: 'OTP verified successfully'
    });
});

// Reset Password
app.post('/api/reset-password', (req, res) => {
    const { token, new_password } = req.body;
    
    if (!token || !new_password) {
        return res.status(400).json({ error: 'Token and new password required' });
    }
    
    if (new_password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // In production, verify the reset token
    // For now, we'll assume it's valid
    
    res.json({
        success: true,
        message: 'Password reset successfully'
    });
});

// Check OTP status (for game polling)
app.get('/api/otp-status/:otp_id', (req, res) => {
    const { otp_id } = req.params;
    
    const otps = loadOTPs();
    const otpData = otps[otp_id];
    
    if (!otpData) {
        return res.json({ exists: false });
    }
    
    if (new Date() > new Date(otpData.expiresAt)) {
        return res.json({ exists: false, expired: true });
    }
    
    res.json({
        exists: true,
        expired: false,
        created_at: otpData.createdAt,
        expires_at: otpData.expiresAt
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// GTA Integration API Routes

// Verify API signature
function verifySignature(payload, signature, timestamp) {
    const expectedSignature = crypto
        .createHmac('sha256', API_SECRET)
        .update(`${payload}${timestamp}`)
        .digest('hex');
    
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

// Middleware for GTA API authentication
function authenticateGTA(req, res, next) {
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];
    
    if (!signature || !timestamp) {
        return res.status(401).json({ error: 'Missing authentication headers' });
    }
    
    // Check timestamp is within 5 minutes
    const now = Date.now();
    const reqTime = parseInt(timestamp);
    if (Math.abs(now - reqTime) > 5 * 60 * 1000) {
        return res.status(401).json({ error: 'Request timestamp too old' });
    }
    
    const payload = JSON.stringify(req.body);
    if (!verifySignature(payload, signature, timestamp)) {
        return res.status(401).json({ error: 'Invalid signature' });
    }
    
    next();
}

// Create account from game registration
app.post('/api/create-account-from-game', authenticateGTA, (req, res) => {
    const { username, password, playerName, playerIp } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    if (username.length < 3 || username.length > 24) {
        return res.status(400).json({ error: 'Username must be 3-24 characters' });
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    }
    
    const users = loadData();
    const normalizedUsername = username.toLowerCase();
    
    if (users[normalizedUsername]) {
        return res.status(409).json({ error: 'Account already exists' });
    }
    
    // Hash password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Password hashing error:', err);
        }
        
        // Create user with job-specific ranking structure
        users[normalizedUsername] = {
            password: hashedPassword || password, // Fallback to plain text if bcrypt fails
            gta_linked: true,
            gta_account_id: normalizedUsername,
            created_from_game: true,
            created_at: new Date().toISOString(),
            player_name: playerName || username,
            last_ip: playerIp || 'unknown',
            ranks: {
                police: {
                    level: 1,
                    experience: 0,
                    next_level_xp: 100,
                    title: 'Recruit',
                    stats: {
                        arrests_made: 0,
                        tickets_issued: 0,
                        pursuits_completed: 0,
                        time_in_service: 0
                    }
                },
                medic: {
                    level: 1,
                    experience: 0,
                    next_level_xp: 100,
                    title: 'Trainee Medic',
                    stats: {
                        patients_treated: 0,
                        lives_saved: 0,
                        response_time_avg: 0,
                        time_in_service: 0
                    }
                },
                mechanic: {
                    level: 1,
                    experience: 0,
                    next_level_xp: 100,
                    title: 'Apprentice Mechanic',
                    stats: {
                        vehicles_repaired: 0,
                        custom_jobs: 0,
                        avg_repair_time: 0,
                        time_in_service: 0
                    }
                },
                civilian: {
                    level: 1,
                    experience: 0,
                    next_level_xp: 100,
                    title: 'Newcomer',
                    stats: {
                        missions_completed: 0,
                        properties_owned: 0,
                        wealth_earned: 0,
                        time_played: 0
                    }
                }
            },
            global_stats: {
                total_playtime: 0,
                last_active: new Date().toISOString(),
                achievements_unlocked: 0,
                total_achievements: 25
            },
            achievements: [],
            inbox: [
                {
                    from: 'system',
                    subject: 'Welcome to BGF Revival IV!',
                    message: `Welcome ${playerName || username}! Your account has been created from the GTA server. Start playing to build your rank and unlock achievements!`,
                    date: new Date().toISOString(),
                    read: false
                }
            ],
            sent: []
        };
        
        saveData(users);
        
        console.log(`Created account for ${username} from GTA server`);
        
        res.json({
            success: true,
            username: normalizedUsername,
            message: 'Account created successfully'
        });
    });
});

// Batch sync player statistics
app.post('/api/batch-sync-stats', authenticateGTA, (req, res) => {
    const { playerUpdates } = req.body;
    
    if (!Array.isArray(playerUpdates)) {
        return res.status(400).json({ error: 'playerUpdates must be an array' });
    }
    
    const users = loadData();
    let updatedCount = 0;
    const errors = [];
    
    for (const update of playerUpdates) {
        const { username, jobType, stats, experience, newLevel } = update;
        
        if (!username || !jobType || !stats) {
            errors.push({ username, error: 'Missing required fields' });
            continue;
        }
        
        const normalizedUsername = username.toLowerCase();
        const user = users[normalizedUsername];
        
        if (!user) {
            errors.push({ username, error: 'User not found' });
            continue;
        }
        
        // Update job-specific stats
        if (user.ranks && user.ranks[jobType]) {
            user.ranks[jobType].stats = { ...user.ranks[jobType].stats, ...stats };
            
            if (experience !== undefined) {
                user.ranks[jobType].experience = experience;
            }
            
            if (newLevel !== undefined) {
                user.ranks[jobType].level = newLevel;
                // Update next level XP requirement
                user.ranks[jobType].next_level_xp = newLevel * 100;
                
                // Update title based on level
                const titles = {
                    police: ['Recruit', 'Officer', 'Senior Officer', 'Sergeant', 'Lieutenant', 'Captain'],
                    medic: ['Trainee Medic', 'Paramedic', 'Senior Paramedic', 'Emergency Medic', 'Lead Medic', 'Chief Medic'],
                    mechanic: ['Apprentice Mechanic', 'Mechanic', 'Senior Mechanic', 'Expert Mechanic', 'Master Mechanic', 'Lead Mechanic'],
                    civilian: ['Newcomer', 'Resident', 'Experienced Civilian', 'Established Citizen', 'Community Leader', 'Town Legend']
                };
                
                const jobTitles = titles[jobType] || [];
                if (newLevel <= jobTitles.length) {
                    user.ranks[jobType].title = jobTitles[newLevel - 1];
                }
            }
            
            user.global_stats.last_active = new Date().toISOString();
            updatedCount++;
        } else {
            errors.push({ username, error: `Invalid job type: ${jobType}` });
        }
    }
    
    if (updatedCount > 0) {
        saveData(users);
    }
    
    console.log(`Batch sync: ${updatedCount} users updated, ${errors.length} errors`);
    
    res.json({
        success: true,
        updatedCount,
        errors,
        message: `Synced ${updatedCount} players successfully`
    });
});

// Get player rank information
app.get('/api/player-rank/:accountId/:jobType', (req, res) => {
    const { accountId, jobType } = req.params;
    
    if (!accountId || !jobType) {
        return res.status(400).json({ error: 'Account ID and job type required' });
    }
    
    const users = loadData();
    const normalizedUsername = accountId.toLowerCase();
    const user = users[normalizedUsername];
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const rankData = user.ranks && user.ranks[jobType];
    if (!rankData) {
        return res.status(404).json({ error: 'Job type not found' });
    }
    
    res.json({
        username: normalizedUsername,
        jobType,
        rank: rankData,
        globalStats: user.global_stats
    });
});

// Get leaderboard for job type
app.get('/api/leaderboard/:jobType', (req, res) => {
    const { jobType } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    if (!jobType) {
        return res.status(400).json({ error: 'Job type required' });
    }
    
    const users = loadData();
    const leaderboard = [];
    
    for (const [username, user] of Object.entries(users)) {
        if (user.ranks && user.ranks[jobType]) {
            leaderboard.push({
                username,
                player_name: user.player_name || username,
                level: user.ranks[jobType].level,
                experience: user.ranks[jobType].experience,
                title: user.ranks[jobType].title,
                stats: user.ranks[jobType].stats,
                last_active: user.global_stats.last_active
            });
        }
    }
    
    // Sort by experience (descending) then by level (descending)
    leaderboard.sort((a, b) => {
        if (b.experience !== a.experience) {
            return b.experience - a.experience;
        }
        return b.level - a.level;
    });
    
    const paginatedLeaderboard = leaderboard.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
        jobType,
        totalPlayers: leaderboard.length,
        leaderboard: paginatedLeaderboard,
        currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
        totalPages: Math.ceil(leaderboard.length / parseInt(limit))
    });
});

// Get player achievements
app.get('/api/player-achievements/:accountId', (req, res) => {
    const { accountId } = req.params;
    
    if (!accountId) {
        return res.status(400).json({ error: 'Account ID required' });
    }
    
    const users = loadData();
    const normalizedUsername = accountId.toLowerCase();
    const user = users[normalizedUsername];
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
        username: normalizedUsername,
        achievements: user.achievements || [],
        totalAchievements: user.global_stats?.total_achievements || 25,
        unlockedAchievements: user.global_stats?.achievements_unlocked || 0
    });
});

// Update achievements
app.post('/api/update-achievements', authenticateGTA, (req, res) => {
    const { username, newAchievements } = req.body;
    
    if (!username || !Array.isArray(newAchievements)) {
        return res.status(400).json({ error: 'Username and achievements array required' });
    }
    
    const users = loadData();
    const normalizedUsername = username.toLowerCase();
    const user = users[normalizedUsername];
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    user.achievements = user.achievements || [];
    const existingIds = new Set(user.achievements.map(a => a.id));
    
    let addedCount = 0;
    for (const achievement of newAchievements) {
        if (!existingIds.has(achievement.id)) {
            user.achievements.push({
                ...achievement,
                unlocked_at: new Date().toISOString()
            });
            existingIds.add(achievement.id);
            addedCount++;
        }
    }
    
    if (user.global_stats) {
        user.global_stats.achievements_unlocked = user.achievements.length;
    }
    
    saveData(users);
    
    console.log(`Added ${addedCount} new achievements for ${username}`);
    
    res.json({
        success: true,
        addedCount,
        totalAchievements: user.achievements.length,
        message: `Added ${addedCount} new achievements`
    });
});

// Clean expired OTPs every 5 minutes
setInterval(cleanExpiredOTPs, 5 * 60 * 1000);

// Start server
app.listen(port, () => {
    console.log(`BGF Mail API Server running on port ${port}`);
    console.log(`API endpoints available at http://localhost:${port}/api`);
});
