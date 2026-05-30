/**
 * Cloudflare Pages Functions helpers — no Node.js require(), uses fetch + context.env.
 */

const ALLOWED_ORIGIN_EXACT = new Set([
    'https://gabugustav.github.io',
    'https://bgfr-gta-connected.netlify.app',
    'http://localhost:8888',
    'http://127.0.0.1:8888',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
]);

export function isAllowedOrigin(origin) {
    if (!origin) return false;
    if (ALLOWED_ORIGIN_EXACT.has(origin)) return true;
    if (/^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin)) return true;
    if (/^https:\/\/[a-z0-9-]+\.netlify\.app$/i.test(origin)) return true;
    if (/^https:\/\/[a-z0-9-]+\.pages\.dev$/i.test(origin)) return true;
    return false;
}

export function corsHeaders(request) {
    const origin = request.headers.get('Origin') || request.headers.get('origin') || '';
    return {
        'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Signature, X-Timestamp',
        'Vary': 'Origin',
        'Content-Type': 'application/json'
    };
}

export function jsonResponse(request, status, body, extraHeaders = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders(request), ...extraHeaders }
    });
}

export function getSupabaseConfig(env) {
    const url = String(env.SUPABASE_URL || '').trim().replace(/\/$/, '');
    const key = String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (!url || !key) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Cloudflare environment variables');
    }
    return { url, key };
}

export function supabaseHeaders(key, extra = {}) {
    return {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...extra
    };
}

export async function supabaseRest(env, path, options = {}) {
    const { url, key } = getSupabaseConfig(env);
    const response = await fetch(`${url}/rest/v1${path}`, {
        ...options,
        headers: supabaseHeaders(key, options.headers || {})
    });
    return response;
}

export async function readSupabaseError(response) {
    try {
        return await response.json();
    } catch (_) {
        return { message: await response.text().catch(() => 'Unknown error') };
    }
}

export function isDuplicateError(response, payload) {
    if (response.status === 409) return true;
    const code = payload?.code || payload?.error_code;
    if (code === '23505') return true;
    const msg = String(payload?.message || payload?.error || '').toLowerCase();
    return msg.includes('duplicate') || msg.includes('unique');
}
