export async function onRequest(context) {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const { toNetlifyEventAsync, toFetchResponse, applyCloudflareEnv, corsPreflightFetchResponse } = require('../lib/cors');
    const { handleAuthRegister } = require('../lib/handlers/auth-register');

    applyCloudflareEnv(context.env);

    if (context.request.method === 'OPTIONS') {
        return corsPreflightFetchResponse(context.request);
    }

    const event = await toNetlifyEventAsync(context.request);
    const result = await handleAuthRegister(event);
    return toFetchResponse(result);
}
