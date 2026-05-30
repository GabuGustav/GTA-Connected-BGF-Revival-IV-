import { jsonResponse } from './lib/cf-http.js';
import { cfFindUserByIdentifier, cfCreatePasswordResetRequest, cfSendMailMessage } from './lib/cf-supabase-rest.js';

export async function onRequest(context) {
    const { request, env } = context;

    try {
        if (request.method !== 'POST') {
            return jsonResponse(request, 405, { error: 'Method not allowed' });
        }

        const { username } = await request.json();
        const normalized = String(username || '').trim().toLowerCase();

        if (!normalized) {
            return jsonResponse(request, 400, { error: 'Username required' });
        }

        const user = await cfFindUserByIdentifier(env, normalized);
        if (!user) {
            return jsonResponse(request, 404, { error: 'User not found' });
        }

        const otpId = crypto.randomUUID();
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await cfCreatePasswordResetRequest(env, {
            id: otpId,
            username: user.username,
            otpCode: otpCode,
            expiresAt
        });

        try {
            await cfSendMailMessage(env, {
                from: 'system',
                to: user.username,
                subject: 'Password Recovery Code',
                message: `Your 6-digit recovery code is: ${otpCode}\n\nThis code will expire in 15 minutes.\n\nIf you did not request this, ignore this message.`
            });
        } catch (mailError) {
            console.warn('recovery mail:', mailError.message);
        }

        return jsonResponse(request, 200, {
            success: true,
            otp_id: otpId,
            expires_in: 900,
            message: 'Recovery code sent to BGF Mail'
        });
    } catch (error) {
        console.error('forgot-password:', error);
        return jsonResponse(request, 500, {
            error: 'Internal server error',
            message: error.message
        });
    }
}