const crypto = require('crypto');

const SESSION_SECRET = process.env.API_SECRET_KEY || 'default-secret-key-change-in-production';
const SESSION_COOKIE_NAME = 'bgf_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REMEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function base64UrlEncode(value) {
    return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value) {
    return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value) {
    return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}

function createSessionToken(username, remember = false) {
    const normalizedUsername = String(username || '').toLowerCase().trim();
    if (!normalizedUsername) {
        throw new Error('Username required for session token');
    }

    const payload = {
        username: normalizedUsername,
        iat: Date.now(),
        exp: Date.now() + (remember ? REMEMBER_TTL_MS : SESSION_TTL_MS),
        nonce: crypto.randomBytes(16).toString('hex')
    };

    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signature = sign(encodedPayload);
    return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token) {
    if (!token || typeof token !== 'string') {
        return null;
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
        return null;
    }

    const [encodedPayload, providedSignature] = parts;
    const expectedSignature = sign(encodedPayload);

    const providedBuffer = Buffer.from(providedSignature, 'base64url');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64url');
    if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
        return null;
    }

    try {
        const payload = JSON.parse(base64UrlDecode(encodedPayload));
        if (!payload.username || !payload.exp || Date.now() > payload.exp) {
            return null;
        }

        return {
            username: String(payload.username).toLowerCase().trim(),
            remember: payload.exp - payload.iat > SESSION_TTL_MS,
            exp: payload.exp
        };
    } catch (error) {
        return null;
    }
}

function parseCookies(cookieHeader) {
    if (!cookieHeader) {
        return {};
    }

    return cookieHeader.split(';').reduce((cookies, pair) => {
        const [rawKey, ...rawValueParts] = pair.split('=');
        const key = String(rawKey || '').trim();
        const value = rawValueParts.join('=').trim();
        if (key) {
            cookies[key] = value;
        }
        return cookies;
    }, {});
}

function buildSessionCookie(token, remember = false, secure = false) {
    const parts = [
        `${SESSION_COOKIE_NAME}=${token}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax'
    ];

    if (secure) {
        parts.push('Secure');
    }

    if (remember) {
        parts.push(`Max-Age=${Math.floor(REMEMBER_TTL_MS / 1000)}`);
    }

    return parts.join('; ');
}

function buildClearedSessionCookie(secure = false) {
    const parts = [
        `${SESSION_COOKIE_NAME}=`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=0'
    ];

    if (secure) {
        parts.push('Secure');
    }

    return parts.join('; ');
}

function isSecureRequest(req) {
    const protocol = String(req?.headers?.['x-forwarded-proto'] || req?.headers?.['X-Forwarded-Proto'] || '').toLowerCase();
    return protocol === 'https' || process.env.NODE_ENV === 'production';
}

function extractSessionFromRequest(req) {
    const cookies = parseCookies(req?.headers?.cookie || req?.headers?.Cookie || '');
    return verifySessionToken(cookies[SESSION_COOKIE_NAME]);
}

module.exports = {
    SESSION_COOKIE_NAME,
    createSessionToken,
    verifySessionToken,
    parseCookies,
    buildSessionCookie,
    buildClearedSessionCookie,
    isSecureRequest,
    extractSessionFromRequest
};
