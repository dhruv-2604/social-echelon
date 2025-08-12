# Upgrade Notes - Features Ready for Vercel Pro Plan

## Queue Processor Cron Job
When upgrading from Vercel Hobby to Pro plan, add this third cron job to `vercel.json`:

```json
{
  "path": "/api/queue/process",
  "schedule": "*/5 * * * *"  // Runs every 5 minutes
}
```

### What This Enables:
- **Real-time job processing** - Background tasks process every 5 minutes instead of daily
- **Better scalability** - Handles 100+ users without timeouts
- **Faster updates** - Content generation, trend collection, and algorithm detection happen throughout the day
- **Automatic retries** - Failed jobs retry with exponential backoff

### Current Hobby Plan Limitations:
- Max 2 cron jobs (currently using both for daily collection/detection)
- Crons can only run once per day
- 10-second function timeout

### Pro Plan Benefits ($20/month):
- Unlimited cron jobs
- Crons can run every minute
- 60-second function timeout
- Better for production use

## Other Queue-Related Features to Enable:

1. **Trend Collection Cron** (currently removed due to limit):
```json
{
  "path": "/api/trends/collect",
  "schedule": "0 */6 * * *"  // Every 6 hours
}
```

2. **Cache Cleanup Cron**:
```json
{
  "path": "/api/cache/cleanup",
  "schedule": "0 0 * * *"  // Daily at midnight
}
```

## Current Setup (Hobby Plan):
- `/api/algorithm/collect` - Runs at 2 AM daily
- `/api/algorithm/detect` - Runs at 3 AM daily

## Notes:
- The queue system is fully built and ready
- Just needs the cron job to process queued tasks
- Without it, jobs queue up but don't process automatically