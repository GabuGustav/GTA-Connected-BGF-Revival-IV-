/** No Node imports — works even if nodejs_compat is misconfigured. CORS from _middleware.js */
export async function onRequest() {
    return Response.json({
        status: 'healthy',
        provider: 'cloudflare-pages',
        timestamp: new Date().toISOString()
    });
}
