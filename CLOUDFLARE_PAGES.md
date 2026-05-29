# Cloudflare Pages API (with GitHub Pages static UI)

GitHub Pages **cannot** run serverless functions. Cloudflare Pages **can** run the same API from the `/functions` folder in this repo.

## Recommended setup

| What | Where |
|------|--------|
| Website UI | **GitHub Pages** (`gabugustav.github.io/...`) |
| API (primary) | **Cloudflare Pages** (`https://YOUR-PROJECT.pages.dev`) |
| API (fallback) | **Netlify** (`bgfr-gta-connected.netlify.app/.netlify/functions`) |

The browser tries **Cloudflare first**, then **Netlify** (`js/site-config.js` → `apiFetch`).

## One-time Cloudflare setup

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → connect this GitHub repo.
2. **Build settings**
   - Build command: (empty or `echo static`)
   - Build output directory: `_site` — use the same layout as the GitHub Actions deploy, **or** deploy only functions:
     - Output: `.` with **Functions directory** enabled (Cloudflare detects `/functions` automatically)
3. **Settings → Environment variables** (Production):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `API_SECRET_KEY` (same as game server / Netlify)
4. **Settings → Functions** → compatibility flags: enable **Node.js compatibility** (`nodejs_compat`).
5. After deploy, copy your `*.pages.dev` URL into `js/site-config.js`:

```javascript
const BGF_CLOUDFLARE_PAGES_API = 'https://YOUR-PROJECT.pages.dev';
```

6. Push to `main` → GitHub Pages workflow updates the UI; Cloudflare redeploys functions.

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
npx wrangler pages dev .
```

Then open the site with `?source=cloudflare` or point `BGF_CLOUDFLARE_PAGES_API` at the local URL Wrangler prints.

## Netlify quota

When Netlify returns `usage_exceeded`, GitHub Pages + Cloudflare API still works if `BGF_CLOUDFLARE_PAGES_API` is set.
