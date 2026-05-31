/**
 * functions/send-email.js — BGF Revival IV (Cloudflare Pages)
 *
 * Handles BGF internal mail (stored in Supabase) and optionally relays a
 * real notification e-mail via Brevo/Sendinblue.
 *
 * Environment variables (set in Cloudflare Pages → Settings → Environment variables):
 *   SUPABASE_URL                – your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY   – service-role key (never expose to browser)
 *   BREVO_API_KEY               – (optional) Brevo API key for real e-mail relay
 *   BREVO_SENDER_EMAIL          – (optional) verified sender, e.g. noreply@yourdomain.com
 *   BREVO_SENDER_NAME           – (optional) display name, e.g. "BGF Mail"
 */

import { jsonResponse, supabaseRest, readSupabaseError } from './lib/cf-http.js';
import { cfFindUserByIdentifier, cfSendMailMessage }      from './lib/cf-supabase-rest.js';

const MAX_SUBJECT_LEN = 200;
const MAX_MESSAGE_LEN = 4000;

// ─── helpers ────────────────────────────────────────────────────────────────

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

async function relayViaBrevo(env, toAddress, toName, subject, message) {
    const apiKey    = env.BREVO_API_KEY;
    const fromEmail = env.BREVO_SENDER_EMAIL;
    const fromName  = env.BREVO_SENDER_NAME || 'BGF Mail';

    if (!apiKey || !fromEmail) return; // optional — skip silently

    const payload = {
        sender:      { name: fromName, email: fromEmail },
        to:          [{ email: toAddress, name: toName }],
        subject,
        textContent: message,
        htmlContent: `<p>${message.replace(/\n/g, '<br>')}</p>`
    };

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method:  'POST',
        headers: {
            'api-key':      apiKey,         // key lives ONLY on the server
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
        if (String(subject).length > MAX_SUBJECT_LEN) {
            return jsonResponse(request, 400, {
                error: `Subject too long (max ${MAX_SUBJECT_LEN} characters)`
            });
        }
        if (String(message).length > MAX_MESSAGE_LEN) {
            return jsonResponse(request, 400, {
                error: `Message too long (max ${MAX_MESSAGE_LEN} characters)`
            });
        }

        // Normalise recipient
        const toUsername = String(to).replace('@bgf.connected', '').toLowerCase().trim();

        // Verify recipient exists in Supabase
        const recipient = await cfFindUserByIdentifier(env, toUsername);
        if (!recipient) {
            return jsonResponse(request, 404, {
                error:   'User not found',
                message: `User '${toUsername}' is not registered in the BGF system`
            });
        }

        const safeSubject = sanitize(subject);
        const safeMessage = sanitize(message);

        // Store in Supabase (internal BGF mail)
        const result = await cfSendMailMessage(env, {
            from:    from || 'system',
            to:      recipient.username,
            subject: safeSubject,
            message: safeMessage
        });

        // Optionally relay a real notification e-mail (fire-and-forget)
        context.waitUntil(
            relayViaBrevo(
                env,
                `${recipient.username}@bgf.connected`,
                recipient.player_name || recipient.username,
                safeSubject,
                safeMessage
            ).catch((err) => console.warn('[send-email] relay error (non-fatal):', err.message))
        );

        return jsonResponse(request, 200, {
            success:   true,
            message:   'Mail sent successfully',
            messageId: result.inbox?.id ?? null,
            recipient: recipient.username,
            subject:   safeSubject
        });

    } catch (error) {
        console.error('[send-email] error:', error);
        return jsonResponse(request, 500, {
            error:   'Internal server error',
            message: error.message
        });
    }
}