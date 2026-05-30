const crypto = require('crypto');
const { loadBcrypt } = require('./_bcrypt');
const {
    findUserByIdentifier,
    createPasswordResetRequest,
    getPasswordResetRequest,
    markPasswordResetVerified,
    consumePasswordResetToken,
    sendMailMessage
} = require('../../supabase-client');

function response(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return response(200, {});
    if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' });
    try {
        const data = JSON.parse(event.body || '{}');
        return handleForgotPassword(data);
    } catch (error) {
        return response(500, { error: 'Internal server error', message: error.message });
    }
};

async function handleForgotPassword(data) {
    const username = String(data.username || '').trim().toLowerCase();

    if (!username) {
        return response(400, { error: 'Username required' });
    }

    const match = await findUserByIdentifier(username);
    if (!match) {
        return response(404, { error: 'User not found' });
    }

    const otpId = crypto.randomUUID();
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await createPasswordResetRequest({
        id: otpId,
        username: match.username,
        otpCode: otpCode,
        expiresAt
    });

    try {
        await sendMailMessage({
            from: 'system',
            to: match.username,
            subject: 'Password Recovery Code',
            message: `Your 6-digit recovery code is: ${otpCode}\n\nThis code will expire in 15 minutes.`
        });
    } catch (mailError) {
        console.warn('Unable to deliver recovery mail:', mailError.message);
    }

    return response(200, {
        success: true,
        otp_id: otpId,
        expires_in: 900,
        message: 'Recovery code sent to BGF Mail'
    });
}

async function handleVerifyOTP(data) {
    const otpId = data.otp_id;
    const otp = String(data.otp || '').trim();

    if (!otpId || !otp) {
        return response(400, { error: 'OTP ID and code required' });
    }

    const otpData = await getPasswordResetRequest(otpId);
    if (!otpData) {
        return response(400, { error: 'Invalid OTP ID' });
    }

    if (otpData.otp_code !== otp) {
        return response(400, { error: 'Invalid OTP code' });
    }

    if (new Date() > new Date(otpData.expires_at)) {
        return response(400, { error: 'OTP expired' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    await markPasswordResetVerified(otpId, resetToken);

    return response(200, {
        valid: true,
        username: otpData.username,
        reset_token: resetToken,
        message: 'OTP verified successfully'
    });
}

async function handleResetPassword(data) {
    const token = String(data.token || '').trim();
    const newPassword = String(data.new_password || '');

    if (!token || !newPassword) {
        return response(400, { error: 'Token and new password required' });
    }

    if (newPassword.length < 6) {
        return response(400, { error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await loadBcrypt().hash(newPassword, 10);
    const updatedUser = await consumePasswordResetToken(token, hashedPassword);

    if (!updatedUser) {
        return response(400, { error: 'Invalid or expired reset token' });
    }

    return response(200, {
        success: true,
        message: 'Password reset successfully'
    });
}

async function handleOTPStatus(params) {
    const otpId = params?.otp_id;

    if (!otpId) {
        return response(400, { error: 'OTP ID required' });
    }

    const otpData = await getPasswordResetRequest(otpId);

    if (!otpData) {
        return response(200, { exists: false });
    }

    if (new Date() > new Date(otpData.expires_at)) {
        return response(200, { exists: false, expired: true });
    }

    return response(200, {
        exists: true,
        expired: false,
        created_at: otpData.created_at,
        expires_at: otpData.expires_at
    });
}
