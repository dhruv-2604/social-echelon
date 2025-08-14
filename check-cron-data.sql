-- CHECK CRON JOB DATA COLLECTION STATUS
-- Run this in your Supabase SQL Editor to see if cron jobs are working

-- 1. Check what performance data exists (THIS IS WHERE DASHBOARD DATA COMES FROM)
SELECT 
  date,
  COUNT(DISTINCT user_id) as users_tracked,
  AVG(follower_count) as avg_followers,
  AVG(avg_engagement_rate) as avg_engagement,
  AVG(total_posts) as avg_posts
FROM user_performance_summary
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC;

-- 2. Check if TODAY's data has been collected (should run at 2 AM)
SELECT 
  user_id,
  date,
  follower_count,
  avg_engagement_rate,
  total_posts,
  created_at
FROM user_performance_summary
WHERE date = CURRENT_DATE
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check YESTERDAY's data (to see if it ran yesterday)
SELECT 
  user_id,
  date,
  follower_count,
  avg_engagement_rate,
  total_posts,
  created_at
FROM user_performance_summary
WHERE date = CURRENT_DATE - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check your specific user's historical data
-- Replace 'YOUR_USER_ID' with your actual user ID
SELECT 
  date,
  follower_count,
  avg_engagement_rate,
  avg_reach,
  avg_likes,
  total_posts,
  created_at
FROM user_performance_summary
WHERE user_id = 'YOUR_USER_ID'  -- Replace with your actual user ID
ORDER BY date DESC
LIMIT 10;

-- 5. Check job queue for cron activity
SELECT 
  type,
  status,
  created_at,
  completed_at,
  error
FROM job_queue
WHERE type IN ('algorithm_collection', 'algorithm_detection', 'trends_collection')
ORDER BY created_at DESC
LIMIT 20;

-- 6. See gaps in data collection (days where cron didn't run)
WITH date_series AS (
  SELECT generate_series(
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE,
    '1 day'::interval
  )::date AS date
)
SELECT 
  ds.date,
  COUNT(ups.user_id) as users_with_data,
  CASE 
    WHEN COUNT(ups.user_id) = 0 THEN '❌ NO DATA - CRON FAILED'
    ELSE '✅ Data collected'
  END as status
FROM date_series ds
LEFT JOIN user_performance_summary ups ON ds.date = ups.date
GROUP BY ds.date
ORDER BY ds.date DESC;