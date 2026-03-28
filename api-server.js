const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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

// Clean expired OTPs every 5 minutes
setInterval(cleanExpiredOTPs, 5 * 60 * 1000);

// Start server
app.listen(port, () => {
    console.log(`BGF Mail API Server running on port ${port}`);
    console.log(`API endpoints available at http://localhost:${port}/api`);
});
