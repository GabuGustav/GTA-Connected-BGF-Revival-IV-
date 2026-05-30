/**
 * Prepare _site/ for Cloudflare Pages (and local wrangler pages dev).
 * Mirrors .github/workflows/deploy-github-pages.yml
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, '_site');

function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, dest, { recursive: true });
}

if (fs.existsSync(out)) {
  fs.rmSync(out, { recursive: true, force: true });
}
fs.mkdirSync(out, { recursive: true });

for (const name of fs.readdirSync(root)) {
  if (name.endsWith('.html')) {
    fs.copyFileSync(path.join(root, name), path.join(out, name));
  }
}

for (const file of ['favicon.ico', 'ads.txt']) {
  copyIfExists(path.join(root, file), path.join(out, file));
}

for (const dir of ['js', 'zip-manifests']) {
  copyIfExists(path.join(root, dir), path.join(out, dir));
}

fs.writeFileSync(path.join(out, '.nojekyll'), '');
for (const secret of ['.env', 'data.json']) {
  const p = path.join(out, secret);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

require('./sync-functions-lib');

const headers = `# CORS fallback for API paths (Pages Functions handle live traffic)
/auth-register
  Access-Control-Allow-Origin: https://gabugustav.github.io
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Signature, X-Timestamp

/auth-login
  Access-Control-Allow-Origin: https://gabugustav.github.io
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Signature, X-Timestamp

/health
  Access-Control-Allow-Origin: *
`;
fs.writeFileSync(path.join(out, '_headers'), headers);

console.log('Prepared _site for Cloudflare Pages');
