export async function onRequest(context) {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const { buildCorsHeaders } = require('./lib/cors');

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
