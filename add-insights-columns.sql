-- Add Instagram Insights columns to user_performance_summary table
-- These are account-level metrics from Instagram Insights API

ALTER TABLE user_performance_summary 
ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS website_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS accounts_engaged INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_interactions INTEGER DEFAULT 0;

-- Add comment to clarify data sources
COMMENT ON COLUMN user_performance_summary.avg_reach IS 'Average reach from posts in last 7 days';
COMMENT ON COLUMN user_performance_summary.avg_impressions IS 'Average impressions from posts in last 7 days';
COMMENT ON COLUMN user_performance_summary.profile_views IS 'Daily profile views from Instagram Insights API';
COMMENT ON COLUMN user_performance_summary.website_clicks IS 'Daily website clicks from Instagram Insights API';
COMMENT ON COLUMN user_performance_summary.accounts_engaged IS 'Unique accounts engaged from Instagram Insights API';
COMMENT ON COLUMN user_performance_summary.total_interactions IS 'Total daily interactions from Instagram Insights API';