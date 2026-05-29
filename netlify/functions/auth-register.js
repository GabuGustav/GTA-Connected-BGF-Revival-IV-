const { handleCorsPreflight } = require('../../lib/cors');
const { handleAuthRegister } = require('../../lib/handlers/auth-register');

exports.handler = async (event) => {
    const preflight = handleCorsPreflight(event);
    if (preflight) {
        return preflight;
    }
    return handleAuthRegister(event);
};
