# GitHub Pages + Netlify (split hosting)

## Architecture

| Host | Serves |
|------|--------|
| **GitHub Pages** | HTML, CSS, JS (`index.html`, `profile.html`, etc.) |
| **Netlify** | Serverless API only (`/.netlify/functions/*`) |

The browser on `*.github.io` calls `https://bgfr-gta-connected.netlify.app/.netlify/functions/...` (configured in `js/site-config.js`).

## One-time GitHub setup

1. Repo **Settings → Pages**
2. **Build and deployment → Source:** GitHub Actions
3. Push to `main` — workflow **Deploy GitHub Pages** runs automatically
4. Site URL (default): `https://gabugustav.github.io/GTA-Connected-BGF-Revival-IV-/`

## Netlify (keep for API)

- Keep the Netlify site linked to this repo for **functions** and env vars (`SUPABASE_*`, `API_SECRET_KEY`).
- Optional: in Netlify **Site settings → Build**, you can stop caring about the static publish; functions still deploy from `netlify/functions`.
- Root URL on Netlify can redirect to GitHub Pages (see `netlify.toml`).

## Local test

```powershell
# API (functions)
npx netlify-cli dev

# Static (any simple server from repo root)
npx serve .
# Open http://localhost:3000/index.html?source=netlify
```

## Netlify free tier limits

If you see `usage_exceeded`, functions are paused until the quota resets or you upgrade. GitHub Pages does **not** replace Netlify Functions — it only hosts the frontend.

## Change API URL

Edit `BGF_NETLIFY_FUNCTIONS` in `js/site-config.js` if you add a custom Netlify domain.
