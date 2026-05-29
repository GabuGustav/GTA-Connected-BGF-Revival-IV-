-- BGF Revival IV - Supabase Database Schema (Alter Version)
-- This will add missing tables and columns without dropping existing data
-- Use this if you already have some tables and want to add missing ones

-- Check and add missing tables
CREATE TABLE IF NOT EXISTS user_ranks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('police', 'medic', 'mechanic', 'civilian')),
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  next_level_xp INTEGER DEFAULT 100,
  title VARCHAR(255) DEFAULT 'Newcomer',
  
  -- Job-specific stats
  arrests_made INTEGER DEFAULT 0,
  tickets_issued INTEGER DEFAULT 0,
  pursuits_completed INTEGER DEFAULT 0,
  patients_treated INTEGER DEFAULT 0,
  lives_saved INTEGER DEFAULT 0,
  response_time_avg INTEGER DEFAULT 0,
  vehicles_repaired INTEGER DEFAULT 0,
  custom_jobs INTEGER DEFAULT 0,
  avg_repair_time INTEGER DEFAULT 0,
  missions_completed INTEGER DEFAULT 0,
  properties_owned INTEGER DEFAULT 0,
  wealth_earned INTEGER DEFAULT 0,
  time_played INTEGER DEFAULT 0,
  time_in_service INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, job_type)
);

CREATE TABLE IF NOT EXISTS achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  achievement_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  job_type VARCHAR(50),
  icon_url VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS mail_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_username VARCHAR(255) NOT NULL,
  to_username VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read_status BOOLEAN DEFAULT false,
  message_type VARCHAR(20) DEFAULT 'inbox' CHECK (message_type IN ('inbox', 'sent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  otp_code VARCHAR(255) NOT NULL,
  reset_token VARCHAR(255),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  consumed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to users table if they don't exist
DO $$
BEGIN
    -- Add gta_account_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='gta_account_id') THEN
        ALTER TABLE users ADD COLUMN gta_account_id VARCHAR(255) UNIQUE;
    END IF;
    
    -- Add gta_linked if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='gta_linked') THEN
        ALTER TABLE users ADD COLUMN gta_linked BOOLEAN DEFAULT false;
    END IF;
    
    -- Add created_from_game if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='created_from_game') THEN
        ALTER TABLE users ADD COLUMN created_from_game BOOLEAN DEFAULT false;
    END IF;
    
    -- Add total_playtime if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='total_playtime') THEN
        ALTER TABLE users ADD COLUMN total_playtime INTEGER DEFAULT 0;
    END IF;
    
    -- Add achievements_unlocked if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='achievements_unlocked') THEN
        ALTER TABLE users ADD COLUMN achievements_unlocked INTEGER DEFAULT 0;
    END IF;
    
    -- Add total_achievements if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='total_achievements') THEN
        ALTER TABLE users ADD COLUMN total_achievements INTEGER DEFAULT 25;
    END IF;

    -- Dual password: website (password_hash) vs in-game (game_password_hash)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='game_password_hash') THEN
        ALTER TABLE users ADD COLUMN game_password_hash VARCHAR(255);
    END IF;
END $$;

-- Website-only or game-only accounts allowed while linking
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_gta_account_id ON users(gta_account_id);
CREATE INDEX IF NOT EXISTS idx_users_player_name ON users(player_name);
CREATE INDEX IF NOT EXISTS idx_user_ranks_user_id ON user_ranks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ranks_job_type ON user_ranks(job_type);
CREATE INDEX IF NOT EXISTS idx_mail_messages_to_username ON mail_messages(to_username);
CREATE INDEX IF NOT EXISTS idx_mail_messages_from_username ON mail_messages(from_username);
CREATE INDEX IF NOT EXISTS idx_mail_messages_type ON mail_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_username ON password_resets(username);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(reset_token);

-- Enable RLS if not already enabled
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='users' AND table_schema='public') THEN
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_ranks' AND table_schema='public') THEN
        ALTER TABLE user_ranks ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_achievements' AND table_schema='public') THEN
        ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='mail_messages' AND table_schema='public') THEN
        ALTER TABLE mail_messages ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='password_resets' AND table_schema='public') THEN
        ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Insert default achievements if they don't exist
INSERT INTO achievements (achievement_id, name, description, job_type)
SELECT 'first_arrest', 'First Arrest', 'Make your first arrest as a police officer', 'police'
WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE achievement_id = 'first_arrest');

INSERT INTO achievements (achievement_id, name, description, job_type)
SELECT 'first_patient', 'First Patient', 'Treat your first patient as a medic', 'medic'
WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE achievement_id = 'first_patient');

INSERT INTO achievements (achievement_id, name, description, job_type)
SELECT 'first_repair', 'First Repair', 'Complete your first vehicle repair as a mechanic', 'mechanic'
WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE achievement_id = 'first_repair');

INSERT INTO achievements (achievement_id, name, description, job_type)
SELECT 'first_mission', 'First Mission', 'Complete your first civilian mission', 'civilian'
WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE achievement_id = 'first_mission');

INSERT INTO achievements (achievement_id, name, description, job_type)
SELECT 'level_5_police', 'Senior Officer', 'Reach level 5 as a police officer', 'police'
WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE achievement_id = 'level_5_police');

INSERT INTO achievements (achievement_id, name, description, job_type)
SELECT 'level_5_medic', 'Senior Medic', 'Reach level 5 as a medic', 'medic'
WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE achievement_id = 'level_5_medic');

INSERT INTO achievements (achievement_id, name, description, job_type)
SELECT 'level_5_mechanic', 'Master Mechanic', 'Reach level 5 as a mechanic', 'mechanic'
WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE achievement_id = 'level_5_mechanic');

INSERT INTO achievements (achievement_id, name, description, job_type)
SELECT 'level_5_civilian', 'Business Tycoon', 'Reach level 5 as a civilian', 'civilian'
WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE achievement_id = 'level_5_civilian');

-- Success message
SELECT 'BGF Revival IV database schema updated successfully!' as message;
