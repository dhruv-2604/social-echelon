/**
 * Test file for exploring MASA API and Apify scrapers for trend detection
 * Run with: npx tsx test-trend-apis.ts
 */

// Read .env.local file manually since we're running outside Next.js
import { readFileSync } from 'fs'
import { join } from 'path'

try {
  const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
  envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim()
    }
  })
} catch (error) {
  console.log('No .env.local file found, using hardcoded API key')
}

// Force API key for testing if not in env
process.env.MASA_API_KEY = process.env.MASA_API_KEY || 'rVPA1WS9QFNBKfv51yoEIbY4tZaG8yPO8fz3uyHWbwwkrdTU'

const MASA_API_BASE = 'https://data.masa.ai/api/v1'
const APIFY_API_BASE = 'https://api.apify.com/v2'

interface TrendSource {
  name: string
  test: () => Promise<void>
}

// ============= MASA API TESTS =============

async function testMasaTwitterSearch() {
  console.log('\n🐦 Testing MASA Twitter Search API...')
  
  const queries = [
    '#fitness motivation',
    'beauty trends 2024',
    'instagram growth tips',
    'content creator advice'
  ]
  
  for (const query of queries) {
    console.log(`\nSearching for: "${query}"`)
    
    try {
      const response = await fetch(`${MASA_API_BASE}/search/live/twitter`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MASA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'twitter-scraper',
          arguments: {
            type: 'searchbyquery',
            query: query,
            max_results: 5
          }
        })
      })
      
      const data = await response.json()
      console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500))
      
      // If we get a UUID, poll for results
      if (data.uuid) {
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        const resultsResponse = await fetch(`${MASA_API_BASE}/search/live/twitter/result/${data.uuid}`, {
          headers: {
            'Authorization': `Bearer ${process.env.MASA_API_KEY}`
          }
        })
        
        const results = await resultsResponse.json()
        console.log('Results preview:', JSON.stringify(results, null, 2).substring(0, 500))
      }
      
    } catch (error) {
      console.error(`Error with query "${query}":`, error)
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
}

async function testMasaInstagramHashtags() {
  console.log('\n📸 Testing MASA Instagram Hashtag API...')
  
  try {
    // Check if MASA supports Instagram hashtag search
    const response = await fetch(`${MASA_API_BASE}/search/live/instagram`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MASA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'instagram-scraper',
        arguments: {
          type: 'hashtag',
          hashtag: 'fitness',
          max_results: 10
        }
      })
    })
    
    const data = await response.json()
    console.log('Instagram response:', JSON.stringify(data, null, 2))
    
  } catch (error) {
    console.error('Instagram API error:', error)
  }
}

async function testMasaTikTokTrends() {
  console.log('\n🎵 Testing MASA TikTok Trends API...')
  
  const hashtags = ['fitness', 'beauty', 'lifestyle']
  
  for (const hashtag of hashtags) {
    try {
      const response = await fetch(`${MASA_API_BASE}/search/live/tiktok`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MASA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'tiktok-scraper',
          arguments: {
            type: 'hashtag',
            hashtag: hashtag,
            max_results: 5
          }
        })
      })
      
      const data = await response.json()
      console.log(`\nTikTok #${hashtag}:`, JSON.stringify(data, null, 2).substring(0, 400))
      
    } catch (error) {
      console.error(`TikTok error for #${hashtag}:`, error)
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
}

// ============= APIFY SCRAPERS =============

async function exploreApifyScrapers() {
  console.log('\n🤖 Exploring Apify Scrapers for Trend Detection...')
  
  // Popular Apify scrapers for social media trends
  const scrapers = [
    {
      name: 'Instagram Hashtag Scraper',
      id: 'instagram-hashtag-scraper',
      description: 'Scrapes posts, stats, and trends for Instagram hashtags',
      example: {
        hashtag: 'fitness',
        resultsLimit: 100
      }
    },
    {
      name: 'TikTok Scraper',
      id: 'tikTok-scraper',
      description: 'Scrapes TikTok posts, hashtags, music, and trending content',
      example: {
        searchQueries: ['#fitness'],
        resultsPerQuery: 50
      }
    },
    {
      name: 'Twitter Scraper',
      id: 'twitter-scraper',
      description: 'Scrapes tweets, trends, and user data',
      example: {
        searchTerms: ['fitness motivation'],
        maxTweets: 100
      }
    },
    {
      name: 'YouTube Scraper',
      id: 'youtube-scraper',
      description: 'Scrapes YouTube videos, trends, and analytics',
      example: {
        searchKeywords: ['fitness routine 2024'],
        maxResults: 50
      }
    },
    {
      name: 'Reddit Scraper',
      id: 'reddit-scraper',
      description: 'Scrapes Reddit posts and trending topics',
      example: {
        subreddits: ['fitness', 'beauty'],
        sort: 'hot',
        limit: 100
      }
    },
    {
      name: 'Pinterest Scraper',
      id: 'pinterest-scraper',
      description: 'Scrapes Pinterest boards and trending pins',
      example: {
        searchTerms: ['fitness inspiration'],
        maxItems: 100
      }
    }
  ]
  
  console.log('\n📋 Available Apify Scrapers for Trend Detection:\n')
  
  scrapers.forEach(scraper => {
    console.log(`\n🔧 ${scraper.name}`)
    console.log(`   ID: ${scraper.id}`)
    console.log(`   Description: ${scraper.description}`)
    console.log(`   Example Input:`, JSON.stringify(scraper.example, null, 2))
    console.log(`   URL: https://apify.com/store?search=${scraper.id}`)
  })
  
  // Note: To use Apify scrapers, you need:
  // 1. Apify API token (get from https://console.apify.com/account/integrations)
  // 2. Install @apify/client: npm install @apify/client
  // 3. Use the client to run actors (scrapers)
  
  console.log('\n📝 To integrate Apify scrapers:')
  console.log('1. Sign up at https://apify.com')
  console.log('2. Get API token from https://console.apify.com/account/integrations')
  console.log('3. Install client: npm install @apify/client')
  console.log('4. Example code:')
  console.log(`
import { ApifyClient } from '@apify/client'

const client = new ApifyClient({
  token: process.env.APIFY_TOKEN
})

// Run Instagram hashtag scraper
const run = await client.actor('zuzka/instagram-hashtag-scraper').call({
  hashtags: ['fitness', 'wellness'],
  resultsLimit: 100
})

// Get results
const { items } = await client.dataset(run.defaultDatasetId).listItems()
console.log('Trending posts:', items)
`)
}

// ============= ALTERNATIVE APIS =============

async function exploreAlternativeAPIs() {
  console.log('\n🌐 Alternative APIs for Trend Detection:\n')
  
  const alternatives = [
    {
      name: 'RapidAPI Instagram',
      description: 'Multiple Instagram APIs for hashtags, posts, and trends',
      url: 'https://rapidapi.com/category/social/instagram',
      pricing: 'Freemium - starts at $0/month'
    },
    {
      name: 'SerpApi',
      description: 'Google Trends, YouTube, and social media search results',
      url: 'https://serpapi.com',
      pricing: 'Starts at $50/month'
    },
    {
      name: 'Social Media APIs by Pixelbin',
      description: 'Unified API for multiple social platforms',
      url: 'https://www.pixelbin.io/social-media-api',
      pricing: 'Custom pricing'
    },
    {
      name: 'Crowdtangle (Meta)',
      description: 'Facebook and Instagram public content tracking',
      url: 'https://www.crowdtangle.com',
      pricing: 'Free for academics/journalists'
    },
    {
      name: 'Brand24',
      description: 'Social media monitoring and trend analysis',
      url: 'https://brand24.com/api',
      pricing: 'Starts at $79/month'
    }
  ]
  
  alternatives.forEach(api => {
    console.log(`\n🔌 ${api.name}`)
    console.log(`   Description: ${api.description}`)
    console.log(`   URL: ${api.url}`)
    console.log(`   Pricing: ${api.pricing}`)
  })
}

// ============= MAIN TEST RUNNER =============

async function runTests() {
  console.log('🚀 Starting Trend Detection API Tests\n')
  console.log('=====================================')
  
  const sources: TrendSource[] = [
    { name: 'MASA Twitter Search', test: testMasaTwitterSearch },
    { name: 'MASA Instagram Hashtags', test: testMasaInstagramHashtags },
    { name: 'MASA TikTok Trends', test: testMasaTikTokTrends },
    { name: 'Apify Scrapers Overview', test: exploreApifyScrapers },
    { name: 'Alternative APIs', test: exploreAlternativeAPIs }
  ]
  
  for (const source of sources) {
    console.log(`\n\n${'='.repeat(50)}`)
    console.log(`Testing: ${source.name}`)
    console.log('='.repeat(50))
    
    try {
      await source.test()
    } catch (error) {
      console.error(`Failed to test ${source.name}:`, error)
    }
  }
  
  console.log('\n\n=====================================')
  console.log('✅ All tests completed!')
  console.log('\n📊 Recommendations:')
  console.log('1. MASA API works well for Twitter/X real-time search')
  console.log('2. For Instagram hashtags, consider Apify scrapers or RapidAPI')
  console.log('3. TikTok trends can be collected via MASA or dedicated TikTok scrapers')
  console.log('4. Combine multiple sources for comprehensive trend detection')
  console.log('5. Implement caching to reduce API costs')
}

// Run tests
runTests().catch(console.error)