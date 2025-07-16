-- Create alerts table for storing user notifications
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('algorithm_change', 'trend_alert', 'performance_drop')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

-- Index for fast user queries
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_alerts_read ON alerts(user_id, read) WHERE read = false;

-- Enable RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own alerts
CREATE POLICY "Users can view own alerts" ON alerts
  FOR SELECT USING (auth.uid()::text = user_id);

-- Users can update their own alerts (mark as read)
CREATE POLICY "Users can update own alerts" ON alerts
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Service role can insert alerts
CREATE POLICY "Service role can insert alerts" ON alerts
  FOR INSERT WITH CHECK (true);

-- Alert preferences table
CREATE TABLE IF NOT EXISTS alert_preferences (
  user_id TEXT PRIMARY KEY,
  email_alerts BOOLEAN DEFAULT true,
  sms_alerts BOOLEAN DEFAULT false,
  in_app_alerts BOOLEAN DEFAULT true,
  alert_threshold TEXT DEFAULT 'high' CHECK (alert_threshold IN ('all', 'high', 'critical')),
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own preferences
CREATE POLICY "Users can view own preferences" ON alert_preferences
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own preferences" ON alert_preferences
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own preferences" ON alert_preferences
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);