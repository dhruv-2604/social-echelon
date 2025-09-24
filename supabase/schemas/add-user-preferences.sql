-- Add user preferences to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS primary_goal TEXT CHECK (primary_goal IN ('growth', 'engagement', 'brand_partnerships', 'sales'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS content_style TEXT CHECK (content_style IN ('educational', 'entertaining', 'aspirational', 'authentic'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS voice_tone TEXT CHECK (voice_tone IN ('professional', 'casual', 'inspirational', 'humorous'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS posting_frequency INTEGER DEFAULT 3;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences_set BOOLEAN DEFAULT FALSE;