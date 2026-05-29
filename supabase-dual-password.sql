-- Phase 1: separate game vs website passwords (run in Supabase SQL editor)
-- password_hash  = website / BGF Mail login
-- game_password_hash = in-game /jobauth login (stored for future server-side verify)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'game_password_hash'
    ) THEN
        ALTER TABLE users ADD COLUMN game_password_hash VARCHAR(255);
    END IF;
END $$;

-- Allow website-only or game-only rows while linking
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

COMMENT ON COLUMN users.password_hash IS 'BCrypt hash for website / mail login';
COMMENT ON COLUMN users.game_password_hash IS 'BCrypt hash for GTA in-game auth (same username)';
