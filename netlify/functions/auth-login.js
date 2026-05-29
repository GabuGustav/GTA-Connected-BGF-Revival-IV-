const { handleCorsPreflight } = require('../../lib/cors');
const { handleAuthLogin } = require('../../lib/handlers/auth-login');

exports.handler = async (event) => {
    const preflight = handleCorsPreflight(event);
    if (preflight) {
        return preflight;
    }
    return handleAuthLogin(event);
};
