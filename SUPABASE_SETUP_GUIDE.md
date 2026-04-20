# Supabase Integration Setup Guide

## Overview
This guide walks you through setting up Supabase to replace the file-based data.json storage for your BGF Revival IV server.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in with your account
3. Click "New Project"
4. Choose your organization
5. Enter project name: `bgf-revival-iv`
6. Set database password (save it securely)
7. Choose a region closest to your users
8. Click "Create new project"

## Step 2: Set Up Database Schema

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the sidebar
3. Click "New query"
4. Copy the contents of `supabase-schema.sql`
5. Paste into the SQL editor
6. Click "Run" to execute the schema

This will create:
- `users` table - User accounts and global stats
- `user_ranks` table - Job-specific ranks and stats
- `achievements` table - Available achievements
- `user_achievements` table - User unlocked achievements
- `mail_messages` table - Internal mail system

## Step 3: Get Supabase Credentials

1. In Supabase dashboard, go to "Project Settings"
2. Click on "API" in the sidebar
3. Copy these values:
   - **Project URL** (starts with https://)
   - **service_role** key (starts with eyJhbGciOi...)

## Step 4: Configure Environment Variables

### For Netlify (Production):
1. Go to your Netlify dashboard
2. Select your BGF site
3. Go to "Site settings" > "Build & deploy" > "Environment"
4. Add these environment variables:
   ```
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   API_SECRET_KEY=your-secret-key-for-hmac
   NODE_ENV=production
   ```

### For Local Development:
1. Copy `.env.example` to `.env`
2. Update with your Supabase credentials:
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

## Step 5: Migrate Existing Data

1. Make sure your environment variables are set
2. Run the migration script:
   ```bash
   node migrate-to-supabase.js
   ```

This will:
- Read all users from `data.json`
- Create users in Supabase
- Migrate ranks, achievements, and mail
- Report success/failure for each user

## Step 6: Update Netlify Functions

The following functions have been updated to use Supabase:
- `send-email.js` - Mail system
- `leaderboard.js` - Leaderboard data
- `profile.js` - User profiles
- `player-rank.js` - Individual rank data
- `player-achievements.js` - User achievements

## Step 7: Deploy Changes

1. Commit all changes:
   ```bash
   git add .
   git commit -m "Integrate Supabase database backend"
   git push origin main
   ```

2. Netlify will automatically deploy the changes

## Step 8: Test the Integration

1. Test mail system on deployed site
2. Check leaderboards load correctly
3. Verify profile pages work
4. Test GTA server integration

## GTA Server Integration

Your GTA server can now send data to Supabase through the same Netlify endpoints. The API structure remains the same, but data is now stored in a proper database.

### Example API Calls:
- `POST /api/user/update` - Update user stats
- `POST /api/rank/update` - Update rank progress
- `GET /api/leaderboard/police` - Get police leaderboard

## Benefits of Supabase

1. **Real Database**: Proper SQL database with relationships
2. **Scalability**: Can handle many concurrent users
3. **Security**: Row Level Security (RLS) policies
4. **Performance**: Indexed queries for fast lookups
5. **Backup**: Automatic backups and point-in-time recovery
6. **Real-time**: WebSocket support for live updates

## Troubleshooting

### Common Issues:
1. **Environment Variables**: Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set correctly
2. **Database Connection**: Check your Supabase project is active
3. **Migration Errors**: Verify the SQL schema was executed successfully
4. **CORS Issues**: Supabase handles CORS automatically

### Debug Steps:
1. Check Netlify function logs
2. Verify environment variables in Netlify dashboard
3. Test database connection in Supabase SQL editor
4. Check migration script output

## Next Steps

After successful migration:
1. Backup and remove `data.json`
2. Monitor database performance
3. Set up database monitoring in Supabase
4. Consider adding real-time features

Your BGF Revival IV server now has a professional database backend!
