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

function readOrigin(eventOrRequest) {
    if (!eventOrRequest) {
        return '';
    }
    if (eventOrRequest.headers) {
        if (eventOrRequest.headers.get) {
            return eventOrRequest.headers.get('Origin') || eventOrRequest.headers.get('origin') || '';
        }
        return eventOrRequest.headers.origin || eventOrRequest.headers.Origin || '';
    }
    return '';
}

function buildCorsHeaders(eventOrRequest) {
    const origin = readOrigin(eventOrRequest);
    const allowOrigin = isAllowedOrigin(origin) ? origin : '*';

    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Signature, X-Timestamp',
        'Vary': 'Origin'
    };
}

function jsonResponse(eventOrRequest, statusCode, body, extraHeaders = {}) {
    return {
        statusCode,
        headers: {
            ...buildCorsHeaders(eventOrRequest),
            'Content-Type': 'application/json',
            ...extraHeaders
        },
        body: JSON.stringify(body)
    };
}

function handleCorsPreflight(eventOrRequest) {
    const method = eventOrRequest.httpMethod || eventOrRequest.method;
    if (method !== 'OPTIONS') {
        return null;
    }
    return {
        statusCode: 204,
        headers: buildCorsHeaders(eventOrRequest),
        body: ''
    };
}

/** Cloudflare Pages / Workers fetch Response */
function corsPreflightFetchResponse(request) {
    return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(request)
    });
}

function toFetchResponse(netlifyResult) {
    const headers = new Headers(netlifyResult.headers || {});
    return new Response(netlifyResult.body || '', {
        status: netlifyResult.statusCode,
        headers
    });
}

async function toNetlifyEventAsync(request) {
    const url = new URL(request.url);
    let body = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        body = await request.text();
    }
    return {
        httpMethod: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body,
        path: url.pathname,
        queryStringParameters: Object.fromEntries(url.searchParams.entries())
    };
}

function applyCloudflareEnv(env) {
    if (!env) {
        return;
    }
    if (env.SUPABASE_URL) {
        process.env.SUPABASE_URL = env.SUPABASE_URL;
    }
    if (env.SUPABASE_SERVICE_ROLE_KEY) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    }
    if (env.API_SECRET_KEY) {
        process.env.API_SECRET_KEY = env.API_SECRET_KEY;
    }
}

module.exports = {
    buildCorsHeaders,
    jsonResponse,
    handleCorsPreflight,
    corsPreflightFetchResponse,
    toFetchResponse,
    toNetlifyEventAsync,
    applyCloudflareEnv,
    isAllowedOrigin
};
