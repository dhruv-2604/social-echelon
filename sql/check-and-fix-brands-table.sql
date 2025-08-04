-- First, let's see what columns exist in the brands table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'brands'
ORDER BY ordinal_position;

-- Add ALL missing columns that we need
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS brand_name TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS sub_industry TEXT,
ADD COLUMN IF NOT EXISTS company_size TEXT CHECK (company_size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
ADD COLUMN IF NOT EXISTS headquarters_country TEXT,
ADD COLUMN IF NOT EXISTS headquarters_city TEXT,
ADD COLUMN IF NOT EXISTS ships_to_countries TEXT[],
ADD COLUMN IF NOT EXISTS is_local_only BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS works_with_influencers BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS preferred_creator_size TEXT[] DEFAULT ARRAY['micro', 'macro'],
ADD COLUMN IF NOT EXISTS content_formats TEXT[] DEFAULT ARRAY['posts', 'reels', 'stories'],
ADD COLUMN IF NOT EXISTS pr_email TEXT,
ADD COLUMN IF NOT EXISTS pr_contact_name TEXT,
ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS application_url TEXT,
ADD COLUMN IF NOT EXISTS discovery_source TEXT DEFAULT 'admin',
ADD COLUMN IF NOT EXISTS added_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'inactive')),
ADD COLUMN IF NOT EXISTS total_outreach_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_responses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS brand_values TEXT[],
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS last_campaign_date DATE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add unique constraint on brand_name if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'brands_brand_name_key' 
    AND conrelid = 'brands'::regclass
  ) THEN
    ALTER TABLE brands ADD CONSTRAINT brands_brand_name_key UNIQUE (brand_name);
  END IF;
END $$;

-- Now check the structure again
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'brands'
ORDER BY ordinal_position;