/**
 * Copy shared API modules into functions/lib for Cloudflare Pages deploy.
 * Only /functions is bundled on deploy — root lib/ is not available at runtime.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const libRoot = path.join(root, 'functions', 'lib');

function writeFile(relPath, content) {
    const dest = path.join(libRoot, relPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content, 'utf8');
}

function copyWithReplace(fromRel, toRel, replacements) {
    let content = fs.readFileSync(path.join(root, fromRel), 'utf8');
    for (const [from, to] of replacements) {
        content = content.split(from).join(to);
    }
    writeFile(toRel, content);
}

if (fs.existsSync(libRoot)) {
    fs.rmSync(libRoot, { recursive: true, force: true });
}
fs.mkdirSync(path.join(libRoot, 'handlers'), { recursive: true });

fs.copyFileSync(path.join(root, 'lib/cors.js'), path.join(libRoot, 'cors.js'));

writeFile('bcrypt.js', `// Bundled for Cloudflare Pages (always bcryptjs on Workers)
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
`);

fs.copyFileSync(path.join(root, 'supabase-client.js'), path.join(libRoot, 'supabase-client.js'));
fs.copyFileSync(path.join(root, 'session-auth.js'), path.join(libRoot, 'session-auth.js'));

copyWithReplace('lib/handlers/auth-register.js', 'handlers/auth-register.js', [
    ["require('../../netlify/functions/_bcrypt')", "require('../bcrypt')"],
    ["require('../../supabase-client')", "require('../supabase-client')"],
    ["path.resolve(__dirname, '../../data.json')", "path.resolve(__dirname, '../../../data.json')"],
    ['dotenv.config({ path: path.resolve(__dirname, \'../../.env\') });', 'try { require(\'dotenv\').config(); } catch (_) {}']
]);

copyWithReplace('lib/handlers/auth-login.js', 'handlers/auth-login.js', [
    ["require('../../netlify/functions/_bcrypt')", "require('../bcrypt')"],
    ["require('../../supabase-client')", "require('../supabase-client')"],
    ["require('../../session-auth')", "require('../session-auth')"]
]);

console.log('Synced functions/lib for Cloudflare Pages');
