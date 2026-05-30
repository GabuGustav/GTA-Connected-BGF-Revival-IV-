/**
 * Global CORS for all Pages Functions routes (including OPTIONS preflight).
 * No imports outside /functions — must deploy self-contained.
 */
const ALLOWED_ORIGIN_EXACT = new Set([
    'https://gabugustav.github.io',
    'https://bgfr-gta-connected.netlify.app',
    'http://localhost:8888',
    'http://127.0.0.1:8888',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
]);

function isAllowedOrigin(origin) {
    if (!origin) {
        return false;
    }
    if (ALLOWED_ORIGIN_EXACT.has(origin)) {
        return true;
    }
    if (/^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin)) {
        return true;
    }
    if (/^https:\/\/[a-z0-9-]+\.netlify\.app$/i.test(origin)) {
        return true;
    }
    if (/^https:\/\/[a-z0-9-]+\.pages\.dev$/i.test(origin)) {
        return true;
    }
    return false;
}

function buildCorsHeaders(request) {
    const origin = request.headers.get('Origin') || request.headers.get('origin') || '';
    const allowOrigin = isAllowedOrigin(origin) ? origin : '*';

    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Signature, X-Timestamp',
        'Vary': 'Origin'
    };
}

export async function onRequest(context) {
    if (context.request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: buildCorsHeaders(context.request)
        });
    }

    try {
        const response = await context.next();
        const headers = new Headers(response.headers);
        for (const [key, value] of Object.entries(buildCorsHeaders(context.request))) {
            headers.set(key, value);
        }

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers
        });
    } catch (error) {
        console.error('middleware:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error.message
        }), {
            status: 500,
            headers: {
                ...buildCorsHeaders(context.request),
                'Content-Type': 'application/json'
            }
        });
    }
}
