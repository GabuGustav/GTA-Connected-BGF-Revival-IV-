/**
 * BGF site hosting: GitHub Pages (static) + Netlify (serverless API).
 * Update BGF_NETLIFY_FUNCTIONS if your Netlify site URL changes.
 */
(function (global) {
    const BGF_NETLIFY_FUNCTIONS = 'https://bgfr-gta-connected.netlify.app/.netlify/functions';
    const BGF_GITHUB_PAGES_SITE = 'https://gabugustav.github.io/GTA-Connected-BGF-Revival-IV-';
    const LOCAL_API_BASE = 'http://127.0.0.1:3001';

    function getHostnameContext() {
        const hostname = global.location.hostname;
        const query = new URLSearchParams(global.location.search);
        return {
            hostname,
            forcedMode: query.get('source'),
            isLocalHost: hostname === 'localhost' || hostname === '127.0.0.1',
            isNetlifyHost: hostname.includes('netlify.app'),
            isGitHubPages: hostname.includes('github.io'),
            isApiServerPort: global.location.port === '3001',
            protocol: global.location.protocol
        };
    }

    /** Mail / auth pages — returns base URL without trailing slash */
    function getMailApiBase() {
        const ctx = getHostnameContext();

        if (ctx.forcedMode === 'local' && ctx.isLocalHost && ctx.protocol === 'http:') {
            return `${LOCAL_API_BASE}/api`;
        }
        if (ctx.forcedMode === 'netlify') {
            return BGF_NETLIFY_FUNCTIONS;
        }
        if (ctx.isLocalHost) {
            return `${LOCAL_API_BASE}/api`;
        }
        if (ctx.isNetlifyHost) {
            return '/.netlify/functions';
        }
        return BGF_NETLIFY_FUNCTIONS;
    }

    /**
     * Profile / downloads / leaderboard — { mode, apiBase, releaseBase }
     * mode: local | netlify | remote
     */
    function getRuntimeConfig(releaseBase) {
        const ctx = getHostnameContext();
        const release = releaseBase || 'https://github.com/GabuGustav/GTA-Connected-BGF-Revival-IV-/releases/download/OG_files';

        if (ctx.forcedMode === 'local' && ctx.isLocalHost && ctx.protocol === 'http:') {
            return { mode: 'local', apiBase: `${LOCAL_API_BASE}/api`, releaseBase: release };
        }
        if (ctx.forcedMode === 'netlify') {
            const base = ctx.isNetlifyHost ? `${global.location.origin}/.netlify/functions` : BGF_NETLIFY_FUNCTIONS;
            return { mode: 'netlify', apiBase: base, releaseBase: release };
        }
        if (ctx.forcedMode === 'static') {
            return { mode: 'remote', apiBase: BGF_NETLIFY_FUNCTIONS, releaseBase: release };
        }
        if (ctx.isLocalHost && ctx.isApiServerPort && ctx.protocol === 'http:') {
            return { mode: 'local', apiBase: `${LOCAL_API_BASE}/api`, releaseBase: release };
        }
        if (ctx.isNetlifyHost) {
            return { mode: 'netlify', apiBase: `${global.location.origin}/.netlify/functions`, releaseBase: release };
        }
        return { mode: 'remote', apiBase: BGF_NETLIFY_FUNCTIONS, releaseBase: release };
    }

    function buildApiUrl(config, path) {
        if (!config || !config.apiBase) {
            return null;
        }
        return `${config.apiBase}/${path}`;
    }

    function getLeaderboardApiBase() {
        const ctx = getHostnameContext();
        if (ctx.forcedMode === 'local' || (ctx.isLocalHost && ctx.isApiServerPort)) {
            return { mode: 'local', base: `${LOCAL_API_BASE}/api` };
        }
        if (ctx.isNetlifyHost) {
            return { mode: 'netlify', base: '/.netlify/functions' };
        }
        return { mode: 'remote', base: BGF_NETLIFY_FUNCTIONS };
    }

    global.BGF_SITE = {
        BGF_NETLIFY_FUNCTIONS,
        BGF_GITHUB_PAGES_SITE,
        getMailApiBase,
        getRuntimeConfig,
        buildApiUrl,
        getLeaderboardApiBase
    };
})(typeof window !== 'undefined' ? window : globalThis);
