-- BGF Revival IV - Supabase Database Schema (Reset Version)
-- This will DROP existing tables and recreate them
-- WARNING: This will delete all existing data!

-- Drop existing tables in reverse order (due to foreign key constraints)
DROP TABLE IF EXISTS mail_messages CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS user_ranks CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  player_name VARCHAR(255),
  gta_account_id VARCHAR(255) UNIQUE,
  gta_linked BOOLEAN DEFAULT false,
  created_from_game BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Global stats
  total_playtime INTEGER DEFAULT 0,
  achievements_unlocked INTEGER DEFAULT 0,
  total_achievements INTEGER DEFAULT 25
);

-- User ranks table
CREATE TABLE user_ranks (
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

-- Achievements table
CREATE TABLE achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  achievement_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  job_type VARCHAR(50),
  icon_url VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements (join table)
CREATE TABLE user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_id)
);

-- Mail messages table
CREATE TABLE mail_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_username VARCHAR(255) NOT NULL,
  to_username VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read_status BOOLEAN DEFAULT false,
  message_type VARCHAR(20) DEFAULT 'inbox' CHECK (message_type IN ('inbox', 'sent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE password_resets (
  id UUID PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  otp_code VARCHAR(255) NOT NULL,
  reset_token VARCHAR(255),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  consumed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_gta_account_id ON users(gta_account_id);
CREATE INDEX idx_users_player_name ON users(player_name);
CREATE INDEX idx_user_ranks_user_id ON user_ranks(user_id);
CREATE INDEX idx_user_ranks_job_type ON user_ranks(job_type);
CREATE INDEX idx_mail_messages_to_username ON mail_messages(to_username);
CREATE INDEX idx_mail_messages_from_username ON mail_messages(from_username);
CREATE INDEX idx_mail_messages_type ON mail_messages(message_type);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_password_resets_username ON password_resets(username);
CREATE INDEX idx_password_resets_token ON password_resets(reset_token);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for public data (leaderboards, profiles)
CREATE POLICY "Public read access for users" ON users FOR SELECT USING (true);
CREATE POLICY "Public read access for user ranks" ON user_ranks FOR SELECT USING (true);
CREATE POLICY "Public read access for achievements" ON user_achievements FOR SELECT USING (true);

-- Allow authenticated users to manage their own data
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = username);
CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (auth.uid()::text = username);

-- Mail policies - users can only see their own mail
CREATE POLICY "Users can read own mail" ON mail_messages FOR SELECT USING (to_username = auth.uid()::text OR from_username = auth.uid()::text);
CREATE POLICY "Users can send mail" ON mail_messages FOR INSERT WITH CHECK (from_username = auth.uid()::text);
CREATE POLICY "Users can update own mail read status" ON mail_messages FOR UPDATE USING (to_username = auth.uid()::text);

-- Insert default achievements
INSERT INTO achievements (achievement_id, name, description, job_type) VALUES
('first_arrest', 'First Arrest', 'Make your first arrest as a police officer', 'police'),
('first_patient', 'First Patient', 'Treat your first patient as a medic', 'medic'),
('first_repair', 'First Repair', 'Complete your first vehicle repair as a mechanic', 'mechanic'),
('first_mission', 'First Mission', 'Complete your first civilian mission', 'civilian'),
('level_5_police', 'Senior Officer', 'Reach level 5 as a police officer', 'police'),
('level_5_medic', 'Senior Medic', 'Reach level 5 as a medic', 'medic'),
('level_5_mechanic', 'Master Mechanic', 'Reach level 5 as a mechanic', 'mechanic'),
('level_5_civilian', 'Business Tycoon', 'Reach level 5 as a civilian', 'civilian');

-- Success message
SELECT 'BGF Revival IV database schema created successfully!' as message;
