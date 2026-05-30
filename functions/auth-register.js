export async function onRequest(context) {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const { toNetlifyEventAsync, toFetchResponse, applyCloudflareEnv } = require('./lib/cors');

    applyCloudflareEnv(context.env);

    const { handleAuthRegister } = require('./lib/handlers/auth-register');
    const event = await toNetlifyEventAsync(context.request);
    const result = await handleAuthRegister(event);
    return toFetchResponse(result);
}
