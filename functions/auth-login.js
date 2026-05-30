export async function onRequest(context) {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const { toNetlifyEventAsync, toFetchResponse, applyCloudflareEnv } = require('./lib/cors');

    applyCloudflareEnv(context.env);

    const { handleAuthLogin } = require('./lib/handlers/auth-login');
    const event = await toNetlifyEventAsync(context.request);
    const result = await handleAuthLogin(event);
    return toFetchResponse(result);
}
