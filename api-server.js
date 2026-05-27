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
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:8000'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));
app.use(express.json({ limit: '256kb' }));

// Serve static files
app.use(express.static(__dirname));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Rate limiter for file-serving endpoints.
const downloadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // stricter limit for filesystem-backed download endpoints
  message: { error: 'Too many download requests, please try again later.' }
});

// Stricter auth limiter to reduce brute-force attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true,
  message: { error: 'Too many failed authentication attempts. Please try again later.' }
});

const MAX_STORED_OTPS = 1000;
const MAX_MESSAGES_PER_MAILBOX = 500;
const MAX_BATCH_UPDATES = 500;
const MAX_ACHIEVEMENTS_PER_REQUEST = 100;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_SUBJECT_LENGTH = 200;

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

function trimOldestEntries(mapObject, maxSize, byField) {
    const entries = Object.entries(mapObject);
    if (entries.length <= maxSize) return mapObject;

    entries.sort((a, b) => {
        const aTime = new Date(a[1]?.[byField] || 0).getTime();
        const bTime = new Date(b[1]?.[byField] || 0).getTime();
        return aTime - bTime;
    });

    const keep = entries.slice(entries.length - maxSize);
    return Object.fromEntries(keep);
}

function trimMailbox(messages, maxItems) {
    if (!Array.isArray(messages)) return [];
    if (messages.length <= maxItems) return messages;
    return messages.slice(0, maxItems);
}

function findUserByIdentifier(users, identifier) {
    if (!identifier) {
        return null;
    }

    const normalized = identifier.toLowerCase();
    if (users[normalized]) {
        return {
            username: normalized,
            user: users[normalized]
        };
    }

    for (const [username, user] of Object.entries(users)) {
        const playerName = String(user.player_name || '').toLowerCase();
        if (playerName && playerName === normalized) {
            return {
                username,
                user
            };
        }
    }

    return null;
}

function normalizeUsername(value) {
    return String(value || '').toLowerCase().trim();
}

function buildUserProfile(username, user) {
    return {
        username,
        playerName: user.player_name || username,
        gta_linked: !!user.gta_linked,
        created_from_game: !!user.created_from_game,
        created_at: user.created_at || null,
        inbox: user.inbox || [],
        sent: user.sent || [],
        achievements: user.achievements || [],
        global_stats: user.global_stats || null,
        ranks: user.ranks || null
    };
}

function decodeBridgePayload(encodedPayload) {
    if (!encodedPayload) {
        return null;
    }

    try {
        return JSON.parse(encodedPayload);
    } catch (jsonError) {
        try {
            return JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf8'));
        } catch (base64Error) {
            return null;
        }
    }
}

function getBridgePayload(req) {
    if (req.method === 'GET') {
        return decodeBridgePayload(req.query.payload);
    }

    if (req.body && typeof req.body === 'object') {
        return req.body;
    }

    return null;
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
app.post('/api/forgot-password', authLimiter, (req, res) => {
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
    const boundedOtps = trimOldestEntries(otps, MAX_STORED_OTPS, 'createdAt');
    saveOTPs(boundedOtps);
    
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
app.post('/api/verify-otp', authLimiter, (req, res) => {
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

app.post('/api/auth-login', authLimiter, async (req, res) => {
    const { username, password } = req.body || {};
    const normalizedUsername = normalizeUsername(username);

    if (!normalizedUsername || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const users = loadData();
    const match = findUserByIdentifier(users, normalizedUsername);
    if (!match) {
        return res.status(404).json({ error: 'User not found' });
    }

    const storedUser = match.user;
    const storedPassword = storedUser.password || '';

    let passwordMatches = false;
    if (typeof storedPassword === 'string' && storedPassword.startsWith('$2')) {
        passwordMatches = await bcrypt.compare(password, storedPassword);
    } else {
        passwordMatches = storedPassword === password;
    }

    if (!passwordMatches) {
        return res.status(401).json({ error: 'Incorrect password' });
    }

    storedUser.inbox = storedUser.inbox || [];
    storedUser.sent = storedUser.sent || [];
    saveData(users);

    res.json({
        success: true,
        user: buildUserProfile(match.username, storedUser)
    });
});

app.post('/api/auth-register', authLimiter, async (req, res) => {
    const { username, email, password } = req.body || {};
    const normalizedUsername = normalizeUsername(username).replace(/[^a-z0-9_]/g, '');

    if (!normalizedUsername || normalizedUsername.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 valid characters' });
    }

    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const users = loadData();
    if (users[normalizedUsername]) {
        return res.status(409).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users[normalizedUsername] = {
        password: hashedPassword,
        email: email || '',
        created_at: new Date().toISOString(),
        created_from_game: false,
        gta_linked: false,
        inbox: [
            {
                from: 'system',
                subject: 'Welcome to BGF Mail!',
                message: `Welcome ${normalizedUsername}@bgf.connected! Your account has been created successfully.`,
                date: new Date().toISOString(),
                read: false
            }
        ],
        sent: [],
        achievements: []
    };

    saveData(users);

    res.status(201).json({
        success: true,
        user: buildUserProfile(normalizedUsername, users[normalizedUsername])
    });
});

app.get('/api/profile/:username', (req, res) => {
    const { username } = req.params;
    const users = loadData();
    const match = findUserByIdentifier(users, username);

    if (!match) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json({
        username: match.username,
        player_name: match.user.player_name || match.username,
        gta_linked: !!match.user.gta_linked,
        created_from_game: !!match.user.created_from_game,
        created_at: match.user.created_at || null,
        global_stats: match.user.global_stats || null,
        ranks: match.user.ranks || null,
        achievements: match.user.achievements || [],
        inbox: match.user.inbox || [],
        sent: match.user.sent || []
    });
});

app.post('/api/send-email', (req, res) => {
    const { to, subject, message, from } = req.body || {};

    if (!to || !subject || !message) {
        return res.status(400).json({ error: 'Missing required fields: to, subject, message' });
    }
    if (String(subject).length > MAX_SUBJECT_LENGTH) {
        return res.status(400).json({ error: `Subject too long (max ${MAX_SUBJECT_LENGTH} characters)` });
    }
    if (String(message).length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` });
    }

    const sanitizeHtml = (str) => {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    };

    const users = loadData();
    const recipientIdentifier = normalizeUsername(String(to).replace('@bgf.connected', ''));
    const recipientMatch = findUserByIdentifier(users, recipientIdentifier);

    if (!recipientMatch) {
        return res.status(404).json({
            error: 'User not found',
            message: `User '${recipientIdentifier}' is not registered in the BGF system`
        });
    }

    const recipientUsername = recipientMatch.username;
    const senderUsername = normalizeUsername(from);

    users[recipientUsername].inbox = users[recipientUsername].inbox || [];
    users[recipientUsername].sent = users[recipientUsername].sent || [];

    if (senderUsername && users[senderUsername]) {
        users[senderUsername].inbox = users[senderUsername].inbox || [];
        users[senderUsername].sent = users[senderUsername].sent || [];
    }

    const messageData = {
        from: senderUsername || 'system',
        to: recipientUsername,
        subject: sanitizeHtml(subject),
        message: sanitizeHtml(message),
        date: new Date().toISOString(),
        read: false,
        id: crypto.randomUUID()
    };

    users[recipientUsername].inbox.unshift(messageData);
    users[recipientUsername].inbox = trimMailbox(users[recipientUsername].inbox, MAX_MESSAGES_PER_MAILBOX);

    if (senderUsername && users[senderUsername]) {
        users[senderUsername].sent.unshift({
            ...messageData,
            to: recipientUsername
        });
        users[senderUsername].sent = trimMailbox(users[senderUsername].sent, MAX_MESSAGES_PER_MAILBOX);
    }

    saveData(users);

    res.json({
        success: true,
        message: 'Mail sent successfully',
        messageId: messageData.id,
        recipient: recipientUsername,
        subject: messageData.subject
    });
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
    if (req.method === 'GET') {
        const bridgeApiKey = req.query.api_key;
        if (bridgeApiKey !== GTA_API_KEY) {
            return res.status(401).json({ error: 'Invalid bridge API key' });
        }
        return next();
    }

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
app.all('/api/create-account-from-game', authenticateGTA, (req, res) => {
    const payload = getBridgePayload(req) || {};
    const { username, password, playerName, playerIp } = payload;
    
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
app.all('/api/batch-sync-stats', authenticateGTA, (req, res) => {
    const payload = getBridgePayload(req) || {};
    const { playerUpdates } = payload;
    
    if (!Array.isArray(playerUpdates)) {
        return res.status(400).json({ error: 'playerUpdates must be an array' });
    }
    if (playerUpdates.length > MAX_BATCH_UPDATES) {
        return res.status(400).json({ error: `Too many updates in one request (max ${MAX_BATCH_UPDATES})` });
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
    const match = findUserByIdentifier(users, accountId);
    
    if (!match) {
        return res.status(404).json({ error: 'User not found' });
    }

    const normalizedUsername = match.username;
    const user = match.user;
    
    const rankData = user.ranks && user.ranks[jobType];
    if (!rankData) {
        return res.status(404).json({ error: 'Job type not found' });
    }
    
    res.json({
        username: normalizedUsername,
        playerName: user.player_name || normalizedUsername,
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
    const match = findUserByIdentifier(users, accountId);
    
    if (!match) {
        return res.status(404).json({ error: 'User not found' });
    }

    const normalizedUsername = match.username;
    const user = match.user;
    
    res.json({
        username: normalizedUsername,
        playerName: user.player_name || normalizedUsername,
        achievements: user.achievements || [],
        totalAchievements: user.global_stats?.total_achievements || 25,
        unlockedAchievements: user.global_stats?.achievements_unlocked || 0
    });
});

// Update achievements
app.all('/api/update-achievements', authenticateGTA, (req, res) => {
    const payload = getBridgePayload(req) || {};
    const { username, newAchievements } = payload;
    
    if (!username || !Array.isArray(newAchievements)) {
        return res.status(400).json({ error: 'Username and achievements array required' });
    }
    if (newAchievements.length > MAX_ACHIEVEMENTS_PER_REQUEST) {
        return res.status(400).json({ error: `Too many achievements in one request (max ${MAX_ACHIEVEMENTS_PER_REQUEST})` });
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

// Downloads API endpoints
app.get('/api/downloads/:category', async (req, res) => {
    const { category } = req.params;
    
    // Validate category
    if (!['downloadable-files', 'misc'].includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
    }
    
    try {
        // For production, return static list of files with cloud URLs
        const fileList = [
            {
                name: 'componentpeds.img.zip',
                size: 1090729219,
                category: category,
                description: getFileDescription('componentpeds.img.zip'),
                lastModified: new Date('2026-05-10T09:37:06.758Z'),
                downloadUrl: getCloudDownloadUrl('componentpeds.img.zip'),
                cloudHosted: true
            },
            {
                name: 'pedprops.img.zip',
                size: 48339238,
                category: category,
                description: getFileDescription('pedprops.img.zip'),
                lastModified: new Date('2026-05-10T09:37:35.736Z'),
                downloadUrl: getCloudDownloadUrl('pedprops.img.zip'),
                cloudHosted: true
            },
            {
                name: 'radar.img.zip',
                size: 1309807,
                category: category,
                description: getFileDescription('radar.img.zip'),
                lastModified: new Date('2026-05-10T09:37:42.660Z'),
                downloadUrl: getCloudDownloadUrl('radar.img.zip'),
                cloudHosted: true
            },
            {
                name: 'Vehicle.img.zip',
                size: 138258916,
                category: category,
                description: getFileDescription('Vehicle.img.zip'),
                lastModified: new Date('2026-05-10T09:37:52.628Z'),
                downloadUrl: getCloudDownloadUrl('Vehicle.img.zip'),
                cloudHosted: true
            },
            {
                name: 'weapons.img.zip',
                size: 5366198,
                category: category,
                description: getFileDescription('weapons.img.zip'),
                lastModified: new Date('2026-05-10T09:38:11.956Z'),
                downloadUrl: getCloudDownloadUrl('weapons.img.zip'),
                cloudHosted: true
            },
            {
                name: 'weapons_e1.img.zip',
                size: 10854730,
                category: category,
                description: getFileDescription('weapons_e1.img.zip'),
                lastModified: new Date('2026-05-10T09:37:59.451Z'),
                downloadUrl: getCloudDownloadUrl('weapons_e1.img.zip'),
                cloudHosted: true
            },
            {
                name: 'weapons_e2.img.zip',
                size: 3766619,
                category: category,
                description: getFileDescription('weapons_e2.img.zip'),
                lastModified: new Date('2026-05-10T09:38:05.270Z'),
                downloadUrl: getCloudDownloadUrl('weapons_e2.img.zip'),
                cloudHosted: true
            }
        ];
        
        // Sort files by name
        fileList.sort((a, b) => a.name.localeCompare(b.name));
        
        res.json(fileList);
    } catch (error) {
        console.error('Error loading download files:', error);
        res.status(500).json({ error: 'Failed to load files' });
    }
});

// Serve download files
app.get('/downloads/:category/:filename', downloadLimiter, (req, res) => {
    const { category, filename } = req.params;
    
    // Validate category
    if (!['downloadable-files', 'misc'].includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
    }
    
    const filePath = path.join(__dirname, category, filename);
    
    // Security check: ensure file exists and is within the expected directory
    if (!fs.existsSync(filePath) || !filePath.startsWith(path.join(__dirname, category))) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Send file
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to download file' });
            }
        } else {
            console.log(`File downloaded: ${filename} from ${category}`);
        }
    });
});

// Helper function to get file descriptions
function getFileDescription(filename) {
    const descriptions = {
        'componentpeds.img.zip': 'Character and pedestrian models for GTA IV',
        'pedprops.img.zip': 'Pedestrian props and accessories',
        'radar.img.zip': 'Radar and minimap textures',
        'Vehicle.img.zip': 'Vehicle models and textures',
        'weapons.img.zip': 'Weapon models and textures',
        'weapons_e1.img.zip': 'Enhanced weapons pack 1',
        'weapons_e2.img.zip': 'Enhanced weapons pack 2'
    };
    
    const lowerFilename = filename.toLowerCase();
    for (const [key, description] of Object.entries(descriptions)) {
        if (lowerFilename.includes(key.toLowerCase())) {
            return description;
        }
    }
    
    return `Download file: ${filename}`;
}

// Helper function to get cloud download URL
function getCloudDownloadUrl(filename) {
    const githubRepo = 'GabuGustav/GTA-Connected-BGF-Revival-IV-';
    const baseUrl = `https://github.com/${githubRepo}/releases/latest/download`;
    
    return `${baseUrl}/${filename}`;
}

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, exponent);
    return `${value.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`;
}

// ZIP preview endpoint
app.get('/api/downloads/:category/:filename([^/]+)/preview', downloadLimiter, async (req, res) => {
    const { category, filename } = req.params;
    
    // Validate category
    if (!['downloadable-files', 'misc'].includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
    }
    
    const filePath = path.join(__dirname, category, filename);
    
    // Security check: ensure file exists and is within expected directory
    if (!fs.existsSync(filePath) || !filePath.startsWith(path.join(__dirname, category))) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    // Check if file is a ZIP
    if (!filename.toLowerCase().endsWith('.zip')) {
        return res.status(400).json({ error: 'File is not a ZIP archive' });
    }
    
    try {
        const stats = fs.statSync(filePath);
        
        // Return basic file information without extracting contents
        res.json({
            filename: filename,
            category: category,
            files: [{
                name: filename,
                size: stats.size,
                formattedSize: formatFileSize(stats.size),
                date: stats.mtime.toISOString().split('T')[0],
                type: 'archive'
            }],
            totalFiles: 1,
            totalSize: stats.size,
            basic: true,
            message: 'ZIP preview not available - 7z command not found on server'
        });
    } catch (error) {
        console.error('Error reading ZIP file:', error);
        res.status(500).json({ error: 'Failed to read ZIP file' });
    }
});

// Helper function to parse ZIP listing output
function parseZipOutput(output, zipFilename) {
    const files = [];
    
    if (process.platform === 'win32') {
        // Parse 7z output
        const lines = output.split('\n');
        let inFileList = false;
        
        for (const line of lines) {
            if (line.includes('----') || line.includes('Path')) {
                inFileList = true;
                continue;
            }
            
            if (inFileList && line.trim()) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 6) {
                    const filename = parts[5];
                    const size = parseInt(parts[3]) || 0;
                    const date = parts[2] + ' ' + parts[3];
                    
                    files.push({
                        name: filename,
                        size: size,
                        formattedSize: formatFileSize(size),
                        date: date,
                        type: getFileType(filename)
                    });
                }
            }
        }
    } else {
        // Parse unzip output
        const lines = output.split('\n');
        for (const line of lines) {
            if (line.trim() && !line.startsWith('Archive:') && !line.startsWith('Length')) {
                const match = line.match(/^\s*(\d+)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s+(.+)$/);
                if (match) {
                    const [, size, date, filename] = match;
                    files.push({
                        name: filename.trim(),
                        size: parseInt(size),
                        formattedSize: formatFileSize(size),
                        date: date,
                        type: getFileType(filename.trim())
                    });
                }
            }
        }
    }
    
    return files;
}

// Helper function to get file type
function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const typeMap = {
        'txt': 'text',
        'pdf': 'document',
        'doc': 'document',
        'docx': 'document',
        'jpg': 'image',
        'jpeg': 'image',
        'png': 'image',
        'gif': 'image',
        'mp3': 'audio',
        'ogg': 'audio',
        'wav': 'audio',
        'mp4': 'video',
        'avi': 'video',
        'mkv': 'video',
        'exe': 'executable',
        'msi': 'executable',
        'zip': 'archive',
        'rar': 'archive',
        '7z': 'archive',
        'js': 'code',
        'html': 'code',
        'css': 'code',
        'json': 'data'
    };
    return typeMap[ext] || 'unknown';
}

// Clean expired OTPs every 5 minutes
setInterval(cleanExpiredOTPs, 5 * 60 * 1000);

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`BGF Mail API Server running on port ${port}`);
    console.log(`API endpoints available at http://localhost:${port}/api`);
});
