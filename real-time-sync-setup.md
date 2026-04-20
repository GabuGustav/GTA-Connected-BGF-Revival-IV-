# Real-time GTA Server → Website Sync Setup

## Perfect Solution: Dual System

Your GTA server keeps using local JSON files AND automatically syncs to Supabase for the website.

## How It Works

```
GTA Server (Local JSON) ←→ Real-time Sync → Supabase (Website)
     ↓                              ↓
data.json                 sync-gta-to-supabase.js
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install @supabase/supabase-js dotenv
```

### 2. Set Environment Variables
Update your `.env` file with Supabase credentials (already done)

### 3. Choose Sync Mode

#### Option A: Real-time Sync (Recommended)
```bash
# Starts file watcher - syncs instantly when data.json changes
node sync-gta-to-supabase.js --watch
```

#### Option B: Manual Sync
```bash
# One-time sync when you run it
node sync-gta-to-supabase.js
```

## What This Achieves

✅ **GTA Server**: Keeps using familiar local JSON files
✅ **Website**: Gets real-time updates automatically  
✅ **No Migration**: New accounts sync instantly when created
✅ **Zero Downtime**: Server never stops for migrations
✅ **Backup**: Local files serve as backup

## Integration with Your Current Setup

### GTA Server Side:
- **Continues using** `data.json` for all operations
- **No code changes needed** in your GTA server
- **Same performance** as before

### Website Side:
- **Real-time updates** when GTA server data changes
- **Professional database** (Supabase) for all web features
- **Instant sync** for new users, ranks, mail

## Usage Examples

### Start Real-time Sync:
```bash
cd C:\Users\HomePC\CascadeProjects\gt-connected-server
node sync-gta-to-supabase.js --watch
```

### Output:
```
👀 Starting file watcher for real-time sync...
=== Starting Real-time Sync ===
Syncing user: 1111
  Updated user: 1111
  Synced rank: police level 2
=== Sync Complete ===
Users synced: 1
Errors: 0
```

### When New User Joins GTA Server:
1. **GTA server** creates user in local `data.json`
2. **File watcher** detects change instantly
3. **Sync script** pushes new user to Supabase
4. **Website** shows new user immediately

## Benefits

### For GTA Server:
- ✅ **No performance impact** - sync runs separately
- ✅ **No code changes** - keep your current setup
- ✅ **Local backup** - JSON files always available
- ✅ **Offline capable** - server works without internet

### For Website:
- ✅ **Real-time data** - updates instantly
- ✅ **Professional backend** - Supabase database
- ✅ **Scalable** - handles many users
- ✅ **Features ready** - leaderboards, profiles, mail

## Troubleshooting

### If sync fails:
1. Check environment variables in `.env`
2. Verify Supabase project is active
3. Check file permissions on `data.json`
4. Restart the sync script

### Performance:
- Sync is **very fast** - only processes changed users
- File watcher uses **minimal resources**
- Network requests are **batched** for efficiency

## Next Steps

1. **Test the sync** with `--watch` mode
2. **Verify website** updates in real-time
3. **Keep GTA server running** normally
4. **Monitor sync logs** for any issues

This gives you the best of both worlds - local JSON for server, real-time Supabase for website!
