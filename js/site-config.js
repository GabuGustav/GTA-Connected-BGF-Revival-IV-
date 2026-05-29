/**
 * BGF hosting:
 * - GitHub Pages: static UI only
 * - Cloudflare Pages: API (primary when configured) — /auth-register not /.netlify/functions/...
 * - Netlify: API fallback — /.netlify/functions/...
 */
(function (global) {
    const BGF_NETLIFY_FUNCTIONS = 'https://bgfr-gta-connected.netlify.app/.netlify/functions';
    /** Set after you deploy Cloudflare Pages — e.g. https://bgf-revival.pages.dev */
    const BGF_CLOUDFLARE_PAGES_API = '';
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
            isCloudflarePages: hostname.includes('pages.dev'),
            isApiServerPort: global.location.port === '3001',
            protocol: global.location.protocol
        };
    }

    /** Ordered list of API roots to try (first success wins). */
    function getApiBases() {
        const ctx = getHostnameContext();
        const bases = [];

        if (ctx.forcedMode === 'local' && ctx.isLocalHost && ctx.protocol === 'http:') {
            return [`${LOCAL_API_BASE}/api`];
        }
        if (ctx.forcedMode === 'netlify') {
            return [BGF_NETLIFY_FUNCTIONS];
        }
        if (ctx.forcedMode === 'cloudflare' && BGF_CLOUDFLARE_PAGES_API) {
            return [BGF_CLOUDFLARE_PAGES_API.replace(/\/$/, '')];
        }
        if (ctx.isLocalHost) {
            return [`${LOCAL_API_BASE}/api`];
        }
        if (ctx.isNetlifyHost) {
            return [`${global.location.origin}/.netlify/functions`];
        }
        if (ctx.isCloudflarePages && BGF_CLOUDFLARE_PAGES_API) {
            return [BGF_CLOUDFLARE_PAGES_API.replace(/\/$/, '')];
        }

        if (ctx.isGitHubPages || ctx.forcedMode === 'static') {
            if (BGF_CLOUDFLARE_PAGES_API) {
                bases.push(BGF_CLOUDFLARE_PAGES_API.replace(/\/$/, ''));
            }
            bases.push(BGF_NETLIFY_FUNCTIONS);
            return bases;
        }

        if (BGF_CLOUDFLARE_PAGES_API) {
            bases.push(BGF_CLOUDFLARE_PAGES_API.replace(/\/$/, ''));
        }
        bases.push(BGF_NETLIFY_FUNCTIONS);
        return bases;
    }

    function getMailApiBase() {
        return getApiBases()[0];
    }

    /**
     * fetch with fallback across Cloudflare Pages API then Netlify.
     * path example: auth-register (no leading slash)
     */
    async function apiFetch(path, options) {
        const bases = getApiBases();
        const route = String(path || '').replace(/^\//, '');
        let lastError = null;

        for (let i = 0; i < bases.length; i += 1) {
            const base = bases[i];
            const url = `${base}/${route}`;
            const hasFallback = i < bases.length - 1;
            try {
                const response = await fetch(url, options);
                if (response.status === 0) {
                    lastError = new Error(`Network error calling ${url}`);
                    continue;
                }
                if (hasFallback && (response.status === 404 || response.status === 502 || response.status === 503)) {
                    console.warn('[BGF_SITE] Trying next API host after', response.status, url);
                    continue;
                }
                return response;
            } catch (error) {
                lastError = error;
                console.warn('[BGF_SITE] API attempt failed:', url, error.message);
            }
        }

        throw lastError || new Error('All API hosts failed');
    }

    function getRuntimeConfig(releaseBase) {
        const ctx = getHostnameContext();
        const release = releaseBase || 'https://github.com/GabuGustav/GTA-Connected-BGF-Revival-IV-/releases/download/OG_files';
        const apiBase = getMailApiBase();
        const mode = ctx.isLocalHost && ctx.isApiServerPort ? 'local' : (ctx.isNetlifyHost ? 'netlify' : 'remote');

        return { mode, apiBase, releaseBase: release };
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
        const base = getMailApiBase();
        return { mode: 'remote', base };
    }

    global.BGF_SITE = {
        BGF_NETLIFY_FUNCTIONS,
        BGF_CLOUDFLARE_PAGES_API,
        BGF_GITHUB_PAGES_SITE,
        getApiBases,
        getMailApiBase,
        apiFetch,
        getRuntimeConfig,
        buildApiUrl,
        getLeaderboardApiBase
    };
})(typeof window !== 'undefined' ? window : globalThis);
