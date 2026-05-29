# Cloudflare Pages API (with GitHub Pages static UI)

GitHub Pages **cannot** run serverless functions. Cloudflare Pages **can** run the API from the `/functions` folder in this repo.

## Recommended setup

| What | Where |
|------|--------|
| Website UI | **GitHub Pages** (`gabugustav.github.io/...`) |
| API (primary) | **Cloudflare Pages** (`https://YOUR-PROJECT.pages.dev`) |
| API (fallback) | **Netlify** (`bgfr-gta-connected.netlify.app/.netlify/functions`) |

The browser tries **Cloudflare first**, then **Netlify** (`js/site-config.js` → `apiFetch`).

## Cloudflare dashboard — required build settings

In **Workers & Pages** → your project → **Settings** → **Build**:

| Field | Value |
|-------|--------|
| **Build command** | `npm run build:cf-pages` |
| **Build output directory** | `_site` |
| **Deploy command** | **Leave empty** (do not use `npx wrangler deploy`) |

### Why the build failed

If **Deploy command** is set to `npx wrangler deploy`, the build fails with:

- `wrangler deploy` is for **Workers**, not **Pages**
- `Missing entry-point to Worker script or to assets directory`

**Fix:** Clear the deploy command field entirely. Cloudflare Pages uploads `_site` and `/functions` automatically after the build command finishes.

`wrangler.toml` in this repo only sets `pages_build_output_dir = "_site"` and `nodejs_compat` — it is not meant for `wrangler deploy` in CI.

## One-time Cloudflare setup

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → connect this GitHub repo.
2. Use the build settings table above.
3. **Settings → Environment variables** (Production):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `API_SECRET_KEY` (same as game server / Netlify)
4. **Settings → Functions** → compatibility flags: enable **Node.js compatibility** (`nodejs_compat`), or rely on `compatibility_flags` in `wrangler.toml`.
5. After deploy, copy your `*.pages.dev` URL into `js/site-config.js`:

```javascript
const BGF_CLOUDFLARE_PAGES_API = 'https://YOUR-PROJECT.pages.dev';
```

6. Push to `main` → GitHub Pages workflow updates the UI; Cloudflare redeploys API + optional static mirror in `_site`.

## API routes on Cloudflare

| Cloudflare URL | Same as Netlify |
|----------------|-----------------|
| `https://xxx.pages.dev/auth-register` | `/.netlify/functions/auth-register` |
| `https://xxx.pages.dev/auth-login` | `/.netlify/functions/auth-login` |

More endpoints can be added under `/functions/` using the same pattern as `functions/auth-register.js`.

## CORS

Functions return `Access-Control-Allow-Origin: https://gabugustav.github.io` when the request comes from your GitHub Pages site (see `lib/cors.js`).

## Local test

```powershell
npm run pages:dev
```

Then set `BGF_CLOUDFLARE_PAGES_API` in `js/site-config.js` to the local URL Wrangler prints.

## Netlify quota

When Netlify returns `usage_exceeded`, GitHub Pages + Cloudflare API still works if `BGF_CLOUDFLARE_PAGES_API` is set.
