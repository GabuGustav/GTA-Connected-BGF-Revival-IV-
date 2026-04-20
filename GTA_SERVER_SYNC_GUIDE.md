# GTA Server → Supabase Sync Guide

## Current Issue: 283 Failed Requests

Your GTA server is failing to sync because it's still trying to use the old data.json format. Here's how to fix it:

## Data Flow Understanding

### Before (File-Based):
```
GTA Server → data.json → Netlify Functions → data.json
```

### After (Supabase-Based):
```
GTA Server → HTTP Requests → Netlify Functions → Supabase Database
```

## What Your GTA Server Is Doing

From the sync files, your server:
1. **Collects player data** during gameplay
2. **Queues requests** in `web_api_queue.json`
3. **Sends HTTP requests** to Netlify functions
4. **Tracks success/failure** in `web_sync_status.json`

## The Problem

Your GTA server is likely sending data in the **old format** that expects `data.json` to exist. The Netlify functions now expect **Supabase format**.

## Solutions

### Option 1: Update GTA Server Code (Recommended)
Your `jobs_rp` resource needs to be updated to send data in the format expected by the new Supabase-based functions.

### Option 2: Create Compatibility Layer
Create a bridge function that converts old format to new Supabase format.

### Option 3: Check Netlify Environment Variables
Make sure your Netlify environment variables are set correctly.

## Immediate Action Items

1. **Check Netlify environment variables** are set
2. **Test API endpoints** manually with the new Supabase functions
3. **Update GTA server** to use correct request format
4. **Monitor sync status** to see failures decrease

## Request Format Changes

### Old Format (data.json based):
```json
{
  "username": "player1",
  "ranks": {
    "police": { "level": 1, "experience": 100 }
  }
}
```

### New Format (Supabase based):
```json
{
  "username": "player1",
  "jobType": "police",
  "level": 1,
  "experience": 100
}
```

## Testing Steps

1. Test a single API call manually
2. Check Netlify function logs
3. Update GTA server request format
4. Monitor sync status for improvement

The goal is to get those 283 failed requests down to 0!
