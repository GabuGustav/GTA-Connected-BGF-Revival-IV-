// Prefer bcryptjs on Netlify/AWS Lambda — native bcrypt often fails at runtime.
function loadBcrypt() {
    const isServerless = Boolean(
        process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME
    );

    if (isServerless) {
        return require('bcryptjs');
    }

    try {
        return require('bcrypt');
    } catch (_) {
        return require('bcryptjs');
    }
}

module.exports = { loadBcrypt };
