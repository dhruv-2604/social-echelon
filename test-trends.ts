// Set the API key directly for testing
process.env.MASA_API_KEY = 'rVPA1WS9QFNBKfv51yoEIbY4tZaG8yPO8fz3uyHWbwwkrdTU'

import { XTwitterCollector } from './src/lib/trends/x-twitter-collector'

// Data quality checks
interface QualityCheck {
  passed: boolean
  message: string
  severity: 'critical' | 'warning' | 'info'
}

function validateDataQuality(trends: any[], niche: string): QualityCheck[] {
  const checks: QualityCheck[] = []
  
  // Check 1: Do we have trends?
  checks.push({
    passed: trends.length > 0,
    message: `Found ${trends.length} trends`,
    severity: 'critical'
  })
  
  if (trends.length === 0) return checks
  
  // Check 2: Are the hashtags relevant to the niche?
  const nicheKeywords: Record<string, string[]> = {
    fitness: ['fitness', 'gym', 'workout', 'health', 'training', 'muscle', 'cardio'],
    fashion: ['fashion', 'style', 'outfit', 'ootd', 'wear', 'trend', 'designer'],
    tech: ['tech', 'code', 'ai', 'software', 'startup', 'app', 'data'],
    food: ['food', 'recipe', 'cooking', 'meal', 'healthy', 'diet', 'nutrition'],
    beauty: ['beauty', 'makeup', 'skincare', 'cosmetic', 'glow', 'routine']
  }
  
  const keywords = nicheKeywords[niche.toLowerCase()] || []
  const relevantTrends = trends.filter(t => 
    keywords.some(kw => t.query.toLowerCase().includes(kw))
  )
  
  checks.push({
    passed: relevantTrends.length >= trends.length * 0.6, // 60% should be relevant
    message: `${relevantTrends.length}/${trends.length} trends are relevant to ${niche}`,
    severity: 'critical'
  })
  
  // Check 3: Do we have real tweets (not mock data)?
  const hasRealTweets = trends.every(t => 
    t.top_tweets.length > 0 && 
    !t.top_tweets[0].content.includes('Just discovered this amazing')
  )
  
  checks.push({
    passed: hasRealTweets,
    message: hasRealTweets ? 'Using REAL tweet data' : 'Using MOCK data (API key issue?)',
    severity: 'critical'
  })
  
  // Check 4: Engagement metrics reasonable?
  const avgEngagement = trends.reduce((sum, t) => sum + t.avg_engagement, 0) / trends.length
  checks.push({
    passed: avgEngagement > 10 && avgEngagement < 10000,
    message: `Average engagement: ${avgEngagement.toFixed(0)} (should be 10-10000)`,
    severity: 'warning'
  })
  
  // Check 5: Content variety
  const uniqueFormats = new Set(trends.flatMap(t => t.content_insights.common_formats))
  checks.push({
    passed: uniqueFormats.size >= 2,
    message: `Found ${uniqueFormats.size} content format types`,
    severity: 'info'
  })
  
  // Check 6: Fresh content (timestamps)
  const now = new Date()
  const recentTweets = trends.flatMap(t => t.top_tweets).filter(tweet => {
    const tweetDate = new Date(tweet.timestamp)
    const daysDiff = (now.getTime() - tweetDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysDiff < 7 // Less than 7 days old
  })
  
  checks.push({
    passed: recentTweets.length > 0,
    message: `${recentTweets.length} tweets from last 7 days`,
    severity: 'warning'
  })
  
  return checks
}

async function testTrendsCollection() {
  console.log('🔍 Data Quality Test for X/Twitter Trends Collection')
  console.log('=' .repeat(60) + '\n')
  
  // Check if API key is configured
  const hasApiKey = !!process.env.MASA_API_KEY
  console.log(hasApiKey ? '✅ API Key configured' : '❌ API Key NOT found - will use mock data')
  console.log('\n')
  
  const collector = new XTwitterCollector()
  const testNiches = ['fitness', 'fashion', 'tech']
  
  const allResults: Record<string, QualityCheck[]> = {}
  
  for (const niche of testNiches) {
    console.log(`📊 Testing ${niche.toUpperCase()} niche:`)
    console.log('─'.repeat(50))
    
    try {
      const trends = await collector.collectTrends(niche)
      const qualityChecks = validateDataQuality(trends, niche)
      allResults[niche] = qualityChecks
      
      // Display quality checks
      for (const check of qualityChecks) {
        const icon = check.passed ? '✅' : check.severity === 'critical' ? '❌' : '⚠️'
        console.log(`${icon} ${check.message}`)
      }
      
      // Show sample of best trending content
      if (trends.length > 0 && trends[0].top_tweets.length > 0) {
        console.log('\n📝 Top Performing Content Sample:')
        const bestTweet = trends[0].top_tweets[0]
        console.log(`   "${bestTweet.content.substring(0, 150)}..."`)
        console.log(`   Engagement: ${bestTweet.likes} likes, ${bestTweet.reposts} reposts`)
        console.log(`   Viral elements: ${trends[0].content_insights.viral_elements.slice(0, 3).join(', ')}`)
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error}`)
      allResults[niche] = [{
        passed: false,
        message: `Failed to collect: ${error}`,
        severity: 'critical'
      }]
    }
    
    console.log('\n')
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  // Final summary
  console.log('=' .repeat(60))
  console.log('📈 QUALITY SUMMARY:')
  console.log('─'.repeat(50))
  
  let totalPassed = 0
  let totalFailed = 0
  let criticalFailures = 0
  
  for (const [niche, checks] of Object.entries(allResults)) {
    const passed = checks.filter(c => c.passed).length
    const failed = checks.filter(c => !c.passed).length
    const critical = checks.filter(c => !c.passed && c.severity === 'critical').length
    
    totalPassed += passed
    totalFailed += failed
    criticalFailures += critical
    
    const status = critical > 0 ? '❌ FAILED' : passed === checks.length ? '✅ PERFECT' : '⚠️  OK'
    console.log(`${niche.toUpperCase()}: ${status} (${passed}/${checks.length} checks passed)`)
  }
  
  console.log('\n' + '=' .repeat(60))
  console.log('OVERALL DATA QUALITY:')
  
  if (criticalFailures > 0) {
    console.log('❌ POOR - Critical issues detected. Check API key and configuration.')
  } else if (totalFailed > totalPassed) {
    console.log('⚠️  FAIR - Some issues detected but usable.')
  } else {
    console.log('✅ GOOD - Data quality meets requirements!')
  }
  
  console.log(`\nStats: ${totalPassed} passed, ${totalFailed} failed (${criticalFailures} critical)`)
}

// Run the test
testTrendsCollection().catch(console.error)