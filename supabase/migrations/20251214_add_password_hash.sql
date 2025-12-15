-- Add password_hash column for email/password authentication
-- This enables users to sign up without Instagram OAuth

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add index for email lookups during login
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Add subscription-related columns if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'pending_payment'
  CHECK (subscription_status IN ('pending_payment', 'active', 'cancelled', 'past_due'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT
  CHECK (subscription_plan IN ('balance', 'harmony'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_cycle TEXT
  CHECK (billing_cycle IN ('monthly', 'annual'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Index for subscription queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
