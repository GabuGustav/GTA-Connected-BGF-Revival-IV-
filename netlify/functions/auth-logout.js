const { buildClearedSessionCookie, isSecureRequest } = require('../../session-auth');

function response(statusCode, body, extraHeaders = {}) {
    return {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Content-Type': 'application/json',
            ...extraHeaders
        },
        body: JSON.stringify(body)
    };
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return response(200, {});
    }

    if (event.httpMethod !== 'POST') {
        return response(405, { error: 'Method not allowed' });
    }

    return response(200, {
        success: true,
        message: 'Logged out successfully'
    }, {
        'Set-Cookie': buildClearedSessionCookie(isSecureRequest(event))
    });
};
