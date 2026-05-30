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
            id: otpCode,
            username: user.username,
            otpCode: otpCode,
            expiresAt
        });

        const emailAddress = user.email || null;

        if (emailAddress) {
            try {
                await fetch('https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': env.BREVO_API_KEY
                    },
                    body: JSON.stringify({
                        sender: { name: 'BGF Revival IV', email: 'noreply@bgfrevival.com' },
                        to: [{ email: emailAddress }],
                        subject: 'BGF Revival IV - Password Recovery Code',
                        textContent: `Your 6-digit recovery code is: ${otpCode}\n\nThis code expires in 15 minutes.\n\nIf you did not request this, ignore this message.`
                    })
                });
            } catch (emailError) {
                console.warn('Brevo email failed, falling back to BGF Mail:', emailError.message);
                await cfSendMailMessage(env, {
                    from: 'system',
                    to: user.username,
                    subject: 'Password Recovery Code',
                    message: `Your 6-digit recovery code is: ${otpCode}\n\nThis code expires in 15 minutes.`
                });
            }
        } else {
            await cfSendMailMessage(env, {
                from: 'system',
                to: user.username,
                subject: 'Password Recovery Code',
                message: `Your 6-digit recovery code is: ${otpCode}\n\nThis code expires in 15 minutes.`
            });
        }

        return jsonResponse(request, 200, {
            success: true,
            otp_id: otpCode,
            expires_in: 900,
            message: emailAddress
                ? 'Recovery code sent to your email address'
                : 'Recovery code sent to BGF Mail'
        });
    } catch (error) {
        console.error('forgot-password:', error);
        return jsonResponse(request, 500, {
            error: 'Internal server error',
            message: error.message
        });
    }
}