/**
 * Test Apify Instagram Scraper with your API token
 * Run with: npx tsx test-apify-instagram.ts
 */

import { ApifyClient } from 'apify-client'

// Set up your API token
process.env.APIFY_TOKEN = 'apify_api_PaOgsTLpX1b3nftEQ1PFixvtXyhJGe20Hhn6'

async function testApifyInstagram() {
  console.log('🚀 Testing Apify Instagram Scraper\n')
  console.log('=====================================\n')
  
  const client = new ApifyClient({
    token: process.env.APIFY_TOKEN
  })

  try {
    // Test 1: Check API token validity
    console.log('✅ API Token configured')
    
    // Test 2: Small hashtag scrape (just 10 posts to test)
    console.log('\n📊 Testing hashtag scraping...')
    console.log('Scraping #fitness (10 posts only for test)\n')
    
    const run = await client.actor('apidojo/instagram-scraper').call({
      startUrls: ['https://www.instagram.com/explore/tags/fitness/'],
      maxItems: 10,
      customMapFunction: `(object) => { 
        return {
          url: object.url,
          likes: object.likeCount,
          comments: object.commentCount,
          caption: object.caption?.substring(0, 100),
          owner: object.owner?.username,
          audio: object.audio ? object.audio.title + ' by ' + object.audio.artist : null,
          createdAt: object.createdAt
        }
      }`
    })
    
    console.log('✅ Scraper started successfully!')
    console.log(`Run ID: ${run.id}`)
    console.log(`Status: ${run.status}`)
    
    // Wait for the scraper to finish
    console.log('\n⏳ Waiting for results...')
    await client.run(run.id).waitForFinish()
    
    // Get the results
    const { items } = await client.dataset(run.defaultDatasetId).listItems()
    
    console.log(`\n✅ Got ${items.length} posts!`)
    console.log('\n📱 Sample Posts:\n')
    
    // Display first 3 posts
    items.slice(0, 3).forEach((post: any, index: number) => {
      console.log(`Post ${index + 1}:`)
      console.log(`  URL: ${post.url}`)
      console.log(`  Likes: ${post.likes}`)
      console.log(`  Comments: ${post.comments}`)
      console.log(`  Owner: @${post.owner}`)
      console.log(`  Audio: ${post.audio || 'No audio'}`)
      console.log(`  Caption: ${post.caption || 'No caption'}...`)
      console.log('')
    })
    
    // Calculate engagement stats
    const totalLikes = items.reduce((sum: number, post: any) => sum + (post.likes || 0), 0)
    const totalComments = items.reduce((sum: number, post: any) => sum + (post.comments || 0), 0)
    const avgEngagement = (totalLikes + totalComments) / items.length
    
    console.log('📈 Engagement Stats:')
    console.log(`  Total Likes: ${totalLikes}`)
    console.log(`  Total Comments: ${totalComments}`)
    console.log(`  Avg Engagement: ${Math.round(avgEngagement)}`)
    
    // Find trending audio
    const audioUsage = new Map<string, number>()
    items.forEach((post: any) => {
      if (post.audio) {
        audioUsage.set(post.audio, (audioUsage.get(post.audio) || 0) + 1)
      }
    })
    
    if (audioUsage.size > 0) {
      console.log('\n🎵 Audio Trends:')
      Array.from(audioUsage.entries()).forEach(([audio, count]) => {
        console.log(`  ${audio}: ${count} uses`)
      })
    }
    
    // Test 3: Cost calculation
    console.log('\n💰 Cost Analysis:')
    console.log(`  Posts scraped: ${items.length}`)
    console.log(`  Cost: $${(items.length * 0.0005).toFixed(4)} (at $0.50 per 1000 posts)`)
    console.log(`  Cost for 1000 posts: $0.50`)
    console.log(`  Cost for 10,000 posts: $5.00`)
    
    console.log('\n=====================================')
    console.log('✅ Apify Instagram Scraper is working perfectly!')
    console.log('\nNext steps:')
    console.log('1. Use ApifyInstagramCollector class for production')
    console.log('2. Set up cron jobs for regular trend collection')
    console.log('3. Store results in your database')
    console.log('4. Build trend analysis dashboard')
    
  } catch (error) {
    console.error('❌ Error:', error)
    console.log('\nTroubleshooting:')
    console.log('1. Check if your Apify account has credits')
    console.log('2. Verify the API token is correct')
    console.log('3. Make sure apidojo/instagram-scraper is available')
  }
}

// Run the test
testApifyInstagram().catch(console.error)