const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Signature, X-Timestamp'
};

function jsonResponse(statusCode, body, extraHeaders = {}) {
    return {
        statusCode,
        headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
            ...extraHeaders
        },
        body: JSON.stringify(body)
    };
}

/** Return a response for OPTIONS preflight, or null to continue. */
function handleCorsPreflight(event) {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: CORS_HEADERS,
            body: ''
        };
    }
    return null;
}

module.exports = {
    CORS_HEADERS,
    jsonResponse,
    handleCorsPreflight
};
