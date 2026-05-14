# Fix 502 Error - Netlify Environment Variables Setup

## Problem: 502 Bad Gateway

Your Netlify functions are returning 502 because they can't connect to Supabase - environment variables are missing on Netlify.

## Immediate Fix Required

### 1. Go to Netlify Dashboard
1. Visit [netlify.com](https://app.netlify.com)
2. Select your BGF site
3. Go to **Site settings** → **Build & deploy** → **Environment**
4. Add these environment variables:


### 2. Deploy Changes
After adding environment variables:
1. Go to **Deploys** tab in Netlify
2. Click **Trigger deploy** or push a small change
3. Wait for deployment to complete

## Why This Happens

### Local vs Production:
- **Local**: `.env` file loads fine ✅
- **Netlify**: No environment variables set ❌ → 502 error

### The Fix:
Netlify functions need the same environment variables that work locally.

## Verification Steps

### 1. Check Environment Variables
In Netlify dashboard → Environment variables:
- ✅ `SUPABASE_URL` set
- ✅ `SUPABASE_SERVICE_ROLE_KEY` set
- ✅ `API_SECRET_KEY` set

### 2. Test After Deploy
Visit: `https://bgfr-gta-connected.netlify.app/.netlify/functions/leaderboard/civilian?limit=25&offset=0`

Should return JSON instead of 502 error.

### 3. Check Function Logs
In Netlify dashboard → Functions → View logs:
- Look for "Missing Supabase environment variables"
- Should show successful database connections

## Quick Fix Command

If you want to trigger an immediate deploy after setting variables:

```bash
# Make a small change and push
git add --all && git commit -m "Add env variables trigger" && git push origin main
```

## Expected Result

After setting environment variables:
- ✅ Leaderboard loads with data
- ✅ Profile pages work
- ✅ Mail system functions
- ✅ No more 502 errors

This is the most common issue when moving from local to production!
