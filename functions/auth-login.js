export async function onRequest(context) {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const { handleCorsPreflight, toNetlifyEventAsync, toFetchResponse, applyCloudflareEnv, corsPreflightFetchResponse } = require('../lib/cors');
    const { handleAuthLogin } = require('../lib/handlers/auth-login');

    applyCloudflareEnv(context.env);

    if (context.request.method === 'OPTIONS') {
        return corsPreflightFetchResponse(context.request);
    }

    const event = await toNetlifyEventAsync(context.request);
    const result = await handleAuthLogin(event);
    return toFetchResponse(result);
}
