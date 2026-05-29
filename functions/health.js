export async function onRequest(context) {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const { corsPreflightFetchResponse, buildCorsHeaders } = require('../lib/cors');

    if (context.request.method === 'OPTIONS') {
        return corsPreflightFetchResponse(context.request);
    }

    return new Response(JSON.stringify({
        status: 'healthy',
        provider: 'cloudflare-pages',
        timestamp: new Date().toISOString()
    }), {
        status: 200,
        headers: {
            ...buildCorsHeaders(context.request),
            'Content-Type': 'application/json'
        }
    });
}
