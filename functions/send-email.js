import { jsonResponse } from './lib/cf-http.js';
import { cfFindUserByIdentifier, cfSendMailMessage } from './lib/cf-supabase-rest.js';

function sanitizeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

export async function onRequest(context) {
    const { request, env } = context;

    try {
        if (request.method !== 'POST') {
            return jsonResponse(request, 405, { error: 'Method not allowed' });
        }

        const { to, subject, message, from } = await request.json();

        if (!to || !subject || !message) {
            return jsonResponse(request, 400, {
                error: 'Missing required fields: to, subject, message'
            });
        }

        const toUsername = String(to).replace('@bgf.connected', '').toLowerCase().trim();
        const recipientUser = await cfFindUserByIdentifier(env, toUsername);

        if (!recipientUser) {
            return jsonResponse(request, 404, {
                error: 'User not found',
                message: `User '${toUsername}' is not registered in the BGF system`
            });
        }

        const result = await cfSendMailMessage(env, {
            from: from || 'system',
            to: toUsername,
            subject: sanitizeHtml(subject),
            message: sanitizeHtml(message)
        });

        return jsonResponse(request, 200, {
            success: true,
            message: 'Mail sent successfully',
            messageId: result.inbox?.id,
            recipient: toUsername,
            subject: sanitizeHtml(subject)
        });
    } catch (error) {
        console.error('send-email:', error);
        return jsonResponse(request, 500, {
            error: 'Internal server error',
            message: error.message
        });
    }
}
