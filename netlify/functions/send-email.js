/**
 * netlify/functions/send-email.js — BGF Revival IV
 *
 * Handles BGF internal mail (stored in Supabase) and optionally relays a
 * real notification e-mail via Brevo/Sendinblue.
 *
 * Environment variables (set in Netlify UI → Site → Environment variables):
 *   SUPABASE_URL                – your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY   – service-role key (never expose to browser)
 *   BREVO_API_KEY               – (optional) Brevo API key for real e-mail relay
 *   BREVO_SENDER_EMAIL          – (optional) verified sender address, e.g. noreply@yourdomain.com
 *   BREVO_SENDER_NAME           – (optional) sender display name, e.g. "BGF Mail"
 */

'use strict';

const { findUserByIdentifier, sendMailMessage } = require('../../supabase-client');

// ─── helpers ────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type':                 'application/json'
};

function respond(statusCode, body) {
    return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

const MAX_SUBJECT_LEN = 200;
const MAX_MESSAGE_LEN = 4000;

function sanitize(str) {
    return String(str || '')
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#x27;')
        .replace(/\//g, '&#x2F;');
}

// ─── optional real-email relay via Brevo ────────────────────────────────────

async function relayViaBrevо(to, toUsername, subject, message) {
    const apiKey    = process.env.BREVO_API_KEY;
    const fromEmail = process.env.BREVO_SENDER_EMAIL;
    const fromName  = process.env.BREVO_SENDER_NAME || 'BGF Mail';

    if (!apiKey || !fromEmail) return; // relay is optional — skip silently

    const payload = {
        sender:   { name: fromName, email: fromEmail },
        to:       [{ email: to, name: toUsername }],
        subject,
        textContent: message,
        htmlContent: `<p>${message.replace(/\n/g, '<br>')}</p>`
    };

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method:  'POST',
        headers: {
            'api-key':      apiKey,          // key lives ONLY on the server
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const err = await res.text().catch(() => res.statusText);
        console.warn('[send-email] Brevo relay failed:', res.status, err);
    }
}

// ─── handler ────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return respond(200, {});
    if (event.httpMethod !== 'POST')    return respond(405, { error: 'Method not allowed' });

    try {
        const { to, subject, message, from } = JSON.parse(event.body || '{}');

        if (!to || !subject || !message) {
            return respond(400, { error: 'Missing required fields: to, subject, message' });
        }
        if (String(subject).length > MAX_SUBJECT_LEN) {
            return respond(400, { error: `Subject too long (max ${MAX_SUBJECT_LEN} characters)` });
        }
        if (String(message).length > MAX_MESSAGE_LEN) {
            return respond(400, { error: `Message too long (max ${MAX_MESSAGE_LEN} characters)` });
        }

        // Normalise recipient — strip @bgf.connected suffix if present
        const toUsername = String(to).replace('@bgf.connected', '').toLowerCase().trim();

        // Verify recipient exists in Supabase
        const recipient = await findUserByIdentifier(toUsername);
        if (!recipient) {
            return respond(404, {
                error:   'User not found',
                message: `User '${toUsername}' is not registered in the BGF system`
            });
        }

        const safeSubject = sanitize(subject);
        const safeMessage = sanitize(message);

        // Store in Supabase (internal BGF mail)
        const result = await sendMailMessage({
            from:    from || 'system',
            to:      recipient.username,
            subject: safeSubject,
            message: safeMessage
        });

        // Optionally relay a real notification e-mail (fire-and-forget)
        // Only runs when BREVO_API_KEY + BREVO_SENDER_EMAIL env vars are set.
        relayViaBrevо(
            `${recipient.username}@bgf.connected`,
            recipient.player_name || recipient.username,
            safeSubject,
            safeMessage
        ).catch((err) => console.warn('[send-email] relay error (non-fatal):', err.message));

        return respond(200, {
            success:   true,
            message:   'Mail sent successfully',
            messageId: result.inbox?.id ?? null,
            recipient: recipient.username,
            subject:   safeSubject
        });

    } catch (error) {
        console.error('[send-email] error:', error);
        return respond(500, { error: 'Internal server error', message: error.message });
    }
};