import { jsonResponse } from './lib/cf-http.js';
import { cfGetPasswordResetRequest, cfMarkPasswordResetVerified } from './lib/cf-supabase-rest.js';

function randomHex(bytes) {
    const arr = crypto.getRandomValues(new Uint8Array(bytes));
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest(context) {
    const { request, env } = context;

    try {
        if (request.method !== 'POST') {
            return jsonResponse(request, 405, { error: 'Method not allowed' });
        }

        const { otp_id: otpId, otp } = await request.json();
        const code = String(otp || '').trim();

        if (!otpId || !code) {
            return jsonResponse(request, 400, { error: 'OTP ID and code required' });
        }

        const otpData = await cfGetPasswordResetRequest(env, otpId);
        if (!otpData) {
            return jsonResponse(request, 400, { error: 'Invalid OTP ID' });
        }

        if (otpData.otp_code !== code) {
            return jsonResponse(request, 400, { error: 'Invalid OTP code' });
        }

        if (new Date() > new Date(otpData.expires_at)) {
            return jsonResponse(request, 400, { error: 'OTP expired' });
        }

        const resetToken = randomHex(32);
        await cfMarkPasswordResetVerified(env, otpId, resetToken);

        return jsonResponse(request, 200, {
            valid: true,
            username: otpData.username,
            reset_token: resetToken,
            message: 'OTP verified successfully'
        });
    } catch (error) {
        console.error('verify-otp:', error);
        return jsonResponse(request, 500, {
            error: 'Internal server error',
            message: error.message
        });
    }
}
