# Brand Opportunity Scraper Setup

## Overview
The brand opportunity scraper automatically discovers new brand partnerships by monitoring:
- PR newswires for campaign announcements
- Marketing blogs for influencer program launches
- Brand websites for creator applications
- LinkedIn for influencer marketing job postings
- Industry newsletters for budget announcements

## Installation

1. Install the required dependency:
```bash
npm install cheerio
npm install --save-dev @types/cheerio
```

2. Apply the database migration:
```bash
psql -U your_user -d your_database -f brand-opportunities-scraper-schema.sql
```

3. Set up environment variables:
```env
CRON_SECRET=your-secret-key-for-cron-jobs
```

## How It Works

### Daily Scraping (9 AM UTC)
The scraper runs automatically via Vercel Cron at 9 AM UTC daily. It:
1. Fetches content from configured sources
2. Searches for keywords like "influencer program", "creator campaign"
3. Extracts brand names, requirements, and contact info
4. Scores opportunities by relevance
5. Queues new brands for research

### Opportunity Types
- **Campaign Announcement**: New influencer marketing campaigns
- **Program Launch**: Brand ambassador or creator programs
- **Budget Announcement**: Marketing budget allocations
- **Team Change**: New influencer marketing hires
- **Product Launch**: Products needing creator promotion
- **Open Application**: Active creator program applications

### Data Flow
1. **Scraping** → Raw opportunities discovered
2. **Qualification** → Relevance scoring and filtering
3. **Brand Queue** → New brands queued for research
4. **Enrichment** → AI summarization and requirement extraction
5. **Matching** → Connect opportunities to relevant creators

## Adding New Sources

To add a new scraping source:

```sql
INSERT INTO scraping_sources (source_name, source_url, source_type, selectors) VALUES
('Your Source Name', 'https://example.com/news', 'marketing_blog',
  '{"title": ".article-title", "link": ".article-link", "date": ".publish-date"}'::JSONB);
```

## Manual Triggering

Admin users can manually trigger scraping:

```bash
curl -X POST https://your-domain.com/api/brand-discovery/scrape \
  -H "Authorization: Bearer your-admin-token"
```

## Monitoring

View scraped opportunities in the admin dashboard or query directly:

```sql
-- Recent qualified opportunities
SELECT * FROM scraped_opportunities 
WHERE status = 'qualified' 
ORDER BY created_at DESC 
LIMIT 20;

-- Brands pending research
SELECT * FROM scraping_brand_queue 
WHERE status = 'pending' 
ORDER BY priority DESC;
```

## Best Practices

1. **Respect Rate Limits**: The scraper includes delays between requests
2. **User Agent**: We identify as "SocialEchelonBot" in requests
3. **Robots.txt**: Check sites' robots.txt before adding sources
4. **Data Quality**: Manually review high-priority opportunities
5. **Legal Compliance**: Ensure scraping complies with terms of service

## Extending the Scraper

The scraper is designed to be extensible:
- Add new source types in `source_type` enum
- Implement new parsing methods in `web-scraper.ts`
- Add AI enrichment for better requirement extraction
- Integrate with email parsing for newsletter sources

## Troubleshooting

- **No opportunities found**: Check if keywords are too restrictive
- **Scraping failures**: Verify selectors match current page structure
- **Duplicate brands**: The schema prevents duplicates automatically
- **Low relevance scores**: Adjust scoring algorithm in `calculateRelevanceScore()`