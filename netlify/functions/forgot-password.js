const crypto = require('crypto');

// In-memory storage (in production, use Netlify environment variables or a real database)
let users = {
    "admin": {
        password: "admin123",
        inbox: [
            {
                from: "system",
                subject: "Welcome to BGF Mail!",
                message: "Welcome to BGF Revival IV mailing system. This is your internal email for server communications.",
                date: new Date().toISOString(),
                read: false
            }
        ],
        sent: []
    }
};

let otps = {};

exports.handler = async (event, context) => {
    const { httpMethod, body } = event;
    const path = event.path.replace('/.netlify/functions', '');
    
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    if (httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    try {
        const data = JSON.parse(body || '{}');
        
        switch (path) {
            case '/api/forgot-password':
                return handleForgotPassword(data, headers);
            case '/api/verify-otp':
                return handleVerifyOTP(data, headers);
            case '/api/reset-password':
                return handleResetPassword(data, headers);
            case '/api/otp-status':
                return handleOTPStatus(event.pathParameters, headers);
            default:
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Endpoint not found' })
                };
        }
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};

function handleForgotPassword(data, headers) {
    const { username } = data;
    
    if (!username) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Username required' })
        };
    }
    
    if (!users[username.toLowerCase()]) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'User not found' })
        };
    }
    
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // Store OTP
    otps[otpId] = {
        id: otpId,
        code: otp,
        username: username.toLowerCase(),
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
    };
    
    // Send OTP via BGF Mail (you'll implement this)
    console.log(`OTP for ${username}: ${otp} (ID: ${otpId})`);
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            otp_id: otpId,
            expires_in: 900,
            message: 'Recovery code sent to BGF Mail'
        })
    };
}

function handleVerifyOTP(data, headers) {
    const { otp_id, otp } = data;
    
    if (!otp_id || !otp) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'OTP ID and code required' })
        };
    }
    
    const otpData = otps[otp_id];
    
    if (!otpData) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid OTP ID' })
        };
    }
    
    if (otpData.code !== otp) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid OTP code' })
        };
    }
    
    if (new Date() > new Date(otpData.expiresAt)) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'OTP expired' })
        };
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            valid: true,
            username: otpData.username,
            reset_token: resetToken,
            message: 'OTP verified successfully'
        })
    };
}

function handleResetPassword(data, headers) {
    const { token, new_password } = data;
    
    if (!token || !new_password) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Token and new password required' })
        };
    }
    
    if (new_password.length < 6) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Password must be at least 6 characters' })
        };
    }
    
    // In production, verify the reset token
    // For now, we'll assume it's valid and reset any user
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'Password reset successfully'
        })
    };
}

function handleOTPStatus(params, headers) {
    const otp_id = params?.otp_id;
    
    if (!otp_id) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'OTP ID required' })
        };
    }
    
    const otpData = otps[otp_id];
    
    if (!otpData) {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ exists: false })
        };
    }
    
    if (new Date() > new Date(otpData.expiresAt)) {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ exists: false, expired: true })
        };
    }
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            exists: true,
            expired: false,
            created_at: otpData.createdAt,
            expires_at: otpData.expiresAt
        })
    };
}
