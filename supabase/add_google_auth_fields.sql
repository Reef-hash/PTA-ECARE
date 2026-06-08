-- Add Google/Gmail login metadata to existing E-CARE users.
-- Run this once in Supabase SQL Editor before enabling Google login in production.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255) UNIQUE,
    ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'password',
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS google_picture TEXT;

CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);

UPDATE users
SET auth_provider = 'password'
WHERE auth_provider IS NULL;
