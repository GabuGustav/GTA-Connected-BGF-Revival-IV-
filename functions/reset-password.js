import bcrypt from 'bcryptjs';
import { jsonResponse } from './lib/cf-http.js';
import { cfConsumePasswordResetToken } from './lib/cf-supabase-rest.js';

export async function onRequest(context) {
    const { request, env } = context;

    try {
        if (request.method !== 'POST') {
            return jsonResponse(request, 405, { error: 'Method not allowed' });
        }

        const { token, new_password: newPassword } = await request.json();
        const resetToken = String(token || '').trim();
        const password = String(newPassword || '');

        if (!resetToken || !password) {
            return jsonResponse(request, 400, { error: 'Token and new password required' });
        }

        if (password.length < 6) {
            return jsonResponse(request, 400, { error: 'Password must be at least 6 characters' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const updatedUser = await cfConsumePasswordResetToken(env, resetToken, hashedPassword);

        if (!updatedUser) {
            return jsonResponse(request, 400, { error: 'Invalid or expired reset token' });
        }

        return jsonResponse(request, 200, {
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        console.error('reset-password:', error);
        return jsonResponse(request, 500, {
            error: 'Internal server error',
            message: error.message
        });
    }
}
