# GitHub Pages + Netlify (split hosting)

## Can GitHub Pages run serverless functions?

**No.** GitHub Pages only serves **static files** (HTML, CSS, JS). It cannot run `auth-register`, database code, or bcrypt on GitHub’s servers the way Netlify Functions do.

| What you might want | Real option |
|---------------------|-------------|
| API on the **same URL** as the site (no CORS) | **Cloudflare Pages** (static + Workers/Functions on one `*.pages.dev` domain), or a custom domain with `/api` proxied |
| Keep GitHub Pages for the site | **Netlify** (or Cloudflare) hosts the API; browser calls it cross-origin (CORS required) |
| “Functions in the repo” | GitHub **Actions** only **build/deploy** static files — they don’t handle live signup/login requests |

This project uses **GitHub Pages for the UI** + **Netlify for the API**.

## Architecture

| Host | Serves |
|------|--------|
| **GitHub Pages** | HTML, CSS, JS (`index.html`, `profile.html`, etc.) |
| **Netlify** | Serverless API only (`/.netlify/functions/*`) |

The browser on `*.github.io` calls `https://bgfr-gta-connected.netlify.app/.netlify/functions/...` (configured in `js/site-config.js`). That is a **cross-origin** request; Netlify must send CORS headers (see `netlify.toml` `[[headers]]`).

## CORS errors on signup

If you see:

`blocked by CORS policy ... No 'Access-Control-Allow-Origin' header`

Common causes:

1. **Netlify free quota exceeded** (`usage_exceeded`) — the request never reaches your function, so no CORS headers are added. Fix: wait for reset, upgrade Netlify, or run `npx netlify-cli dev` locally.
2. **Missing OPTIONS handler** — fixed on `auth-register` / `auth-login`; edge headers added in `netlify.toml`.

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
