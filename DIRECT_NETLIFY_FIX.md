# Direct Netlify Environment Variable Fix

## Problem: Netlify Auto-Setup Not Working

Netlify claims to set environment variables automatically, but they're not actually working on your deployed functions.

## Immediate Solutions

### Option 1: Netlify CLI (Recommended)
Install Netlify CLI and set environment variables directly:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Set environment variables directly
netlify env:set SUPABASE_URL=https://yfsgmytvwnfotgymskxz.supabase.co
netlify env:set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlmc2dteXR2d25mb3RneW1za3h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjYyODY0MCwiZXhwIjoyMDkyMjA0NjQwfQ.OHD6cYtUwQSrJQW83IFOmJIQFk3XA7bCqJb1p5kWLJM
netlify env:set API_SECRET_KEY=sb_publishable_9nAuaVh0IrlP-PMVqpfCoQ_VWMfTvcS
netlify env:set NODE_ENV=production

# Trigger deploy
netlify deploy --prod
```

### Option 2: Netlify Dashboard Manual
If CLI doesn't work, try the dashboard approach:

1. Go to [netlify.com](https://app.netlify.com)
2. Select your BGF site
3. Go to **Site settings** → **Build & deploy** → **Environment**
4. Add each variable manually:
   - **Variable**: `SUPABASE_URL`
   - **Value**: `https://yfsgmytvwnfotgymskxz.supabase.co`
   - **Scope**: Production, Build, Deploy
5. Click **Save**
6. Repeat for all variables
7. **Trigger deploy** → **Deploys** tab

### Option 3: GitHub Secrets (Alternative)
Add environment variables to GitHub and let Netlify use them:

1. Go to your GitHub repo
2. **Settings** → **Secrets and variables** → **Actions**
3. Add repository secrets:
   - `SUPABASE_URL=https://yfsgmytvwnfotgymskxz.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - `API_SECRET_KEY=sb_publishable_9nAuaVh0IrlP-PMVqpfCoQ_VWMfTvcS`
4. Update your Netlify site to use GitHub Actions for deployment

## Verification Steps

After setting variables:

1. **Test debug function**:
   ```
   https://bgfr-gta-connected.netlify.app/.netlify/functions/debug-env
   ```

2. **Check function logs**:
   - Netlify dashboard → Functions → View logs
   - Look for successful environment variable loading

3. **Test leaderboard**:
   ```
   https://bgfr-gta-connected.netlify.app/.netlify/functions/leaderboard/civilian?limit=25&offset=0
   ```

## Expected Results

After proper environment variable setup:
- ✅ Debug function shows all variables as "SET"
- ✅ Leaderboard returns JSON data (not 502 error)
- ✅ All Netlify functions connect to Supabase
- ✅ Your BGF website works fully

## Why This Happens

Netlify's automatic environment variable detection sometimes fails, especially with:
- Complex project setups
- Multiple environment variables
- Supabase integration (newer feature)

**Manual setup is more reliable and gives you full control.**

## Next Steps

1. Try Option 1 (Netlify CLI) first
2. If that fails, use Option 2 (Dashboard manual)
3. Verify with debug function
4. Test all website functionality

This should permanently fix your 502 errors!
