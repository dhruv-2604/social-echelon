# Vercel Cron Jobs Configuration

## Active Cron Jobs (Hobby Plan - 2 max)
1. **Trends Collection** - `/api/trends/collect` - Runs daily at 1 AM
2. **Algorithm Detection** - `/api/algorithm/detect` - Runs daily at 3 AM

## Disabled Cron Jobs (Enable when upgrading to Pro)
3. **Algorithm Collection** - `/api/algorithm/collect` - Would run daily at 2 AM
4. **Brand Discovery Scrape** - `/api/brand-discovery/scrape` - Would run daily at 9 AM

To enable all cron jobs after upgrading to Pro, add these to `vercel.json`:

```json
{
  "path": "/api/algorithm/collect",
  "schedule": "0 2 * * *"
},
{
  "path": "/api/brand-discovery/scrape",
  "schedule": "0 9 * * *"
}
```