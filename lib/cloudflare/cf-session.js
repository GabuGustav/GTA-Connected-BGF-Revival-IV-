/** Session cookies using Web Crypto (Workers-compatible). */

const SESSION_COOKIE_NAME = 'bgf_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REMEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function base64UrlEncodeBytes(bytes) {
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlEncodeString(value) {
    return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

async function signValue(secret, value) {
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
    return base64UrlEncodeBytes(new Uint8Array(signature));
}

export async function createSessionToken(username, remember, secret) {
    const normalizedUsername = String(username || '').toLowerCase().trim();
    if (!normalizedUsername) {
        throw new Error('Username required for session token');
    }

    const payload = {
        username: normalizedUsername,
        iat: Date.now(),
        exp: Date.now() + (remember ? REMEMBER_TTL_MS : SESSION_TTL_MS),
        nonce: base64UrlEncodeBytes(crypto.getRandomValues(new Uint8Array(16)))
    };

    const encodedPayload = base64UrlEncodeString(JSON.stringify(payload));
    const signature = await signValue(secret, encodedPayload);
    return `${encodedPayload}.${signature}`;
}

export function buildSessionCookie(token, remember, secure) {
    const parts = [
        `${SESSION_COOKIE_NAME}=${token}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax'
    ];
    if (secure) parts.push('Secure');
    if (remember) parts.push(`Max-Age=${Math.floor(REMEMBER_TTL_MS / 1000)}`);
    return parts.join('; ');
}

export function isSecureRequest(request) {
    return request.url.startsWith('https://');
}
