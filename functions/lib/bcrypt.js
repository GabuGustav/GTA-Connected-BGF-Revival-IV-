// Bundled for Cloudflare Pages (always bcryptjs on Workers)
function loadBcrypt() {
    const isWorkers = Boolean(
        typeof caches !== 'undefined' ||
        process.env.CF_PAGES ||
        process.env.CLOUDFLARE_PAGES
    );
    const isServerless = Boolean(
        process.env.NETLIFY ||
        process.env.AWS_LAMBDA_FUNCTION_NAME ||
        isWorkers
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
