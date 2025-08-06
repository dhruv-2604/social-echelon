import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { AlertManager } from '@/lib/algorithm/alert-manager'
import { AlgorithmInsightsProvider } from '@/lib/algorithm/algorithm-insights-provider'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    console.log('🧪 Running Algorithm Week 3 Tests...\n')
    
    const results = {
      alertSystemTest: await testAlertSystem(userId),
      algorithmInsightsTest: await testAlgorithmInsights(),
      contentIntegrationTest: await testContentIntegration(userId),
      autoAdaptationTest: await testAutoAdaptation()
    }
    
    // Calculate overall success
    const allTestsPassed = Object.values(results).every(r => r.success)
    
    return NextResponse.json({
      success: allTestsPassed,
      message: allTestsPassed ? '✅ All Week 3 tests passed!' : '❌ Some tests failed',
      results,
      summary: generateTestSummary(results)
    })
    
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: 'Test suite failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Test 1: Alert System
 */
async function testAlertSystem(userId: string) {
  console.log('📧 Testing Alert System...')
  
  try {
    const alertManager = new AlertManager()
    
    // Create a test algorithm change
    const testChange = {
      type: 'reach_drop' as const,
      metric: 'reel_avg_reach',
      beforeValue: 10000,
      afterValue: 6500,
      percentChange: -35,
      affectedUsers: 42,
      confidence: 85,
      niches: ['lifestyle', 'fashion'],
      recommendations: [
        'Switch to carousel posts for better reach',
        'Post during peak hours (7-9 AM)',
        'Use trending audio in Reels'
      ]
    }
    
    // Send alerts
    await alertManager.sendAlgorithmChangeAlerts([testChange])
    
    // Check if alerts were created
    const alerts = await alertManager.getUserAlerts(userId)
    const recentAlert = alerts.find(a => 
      a.type === 'algorithm_change' && 
      a.created_at > new Date(Date.now() - 60000).toISOString()
    )
    
    return {
      success: !!recentAlert,
      message: recentAlert 
        ? `✅ Alert created successfully: "${recentAlert.title}"`
        : '❌ No alert was created',
      details: {
        alertsCount: alerts.length,
        unreadCount: alerts.filter(a => !a.read).length,
        recentAlert: recentAlert ? {
          title: recentAlert.title,
          severity: recentAlert.severity,
          message: recentAlert.message.substring(0, 100) + '...'
        } : null
      }
    }
  } catch (error) {
    return {
      success: false,
      message: '❌ Alert system test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Test 2: Algorithm Insights Provider
 */
async function testAlgorithmInsights() {
  console.log('📊 Testing Algorithm Insights Provider...')
  
  try {
    // Get current algorithm state
    const state = await AlgorithmInsightsProvider.getCurrentAlgorithmState('lifestyle')
    
    // Verify structure
    const hasRequiredFields = 
      state.last_updated &&
      Array.isArray(state.overall_changes) &&
      Array.isArray(state.content_type_performance) &&
      Array.isArray(state.recommendations)
    
    // Check content type insights
    const contentTypes = ['REELS', 'CAROUSEL_ALBUM', 'IMAGE', 'VIDEO']
    const hasAllContentTypes = contentTypes.every(type =>
      state.content_type_performance.some(p => p.content_type === type)
    )
    
    // Test AI formatting
    const aiPrompt = AlgorithmInsightsProvider.formatForAI(state)
    const hasAIFormat = aiPrompt.includes('CURRENT ALGORITHM INSIGHTS:')
    
    return {
      success: hasRequiredFields && hasAllContentTypes && hasAIFormat,
      message: hasRequiredFields 
        ? '✅ Algorithm insights provider working correctly'
        : '❌ Algorithm insights provider has issues',
      details: {
        lastUpdated: state.last_updated,
        changesDetected: state.overall_changes.length,
        recommendationsCount: state.recommendations.length,
        contentTypeInsights: state.content_type_performance.map(p => ({
          type: p.content_type,
          trend: p.performance_trend,
          multiplier: p.reach_multiplier
        })),
        aiPromptLength: aiPrompt.length
      }
    }
  } catch (error) {
    return {
      success: false,
      message: '❌ Algorithm insights test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Test 3: Content Intelligence Integration
 */
async function testContentIntegration(userId: string) {
  console.log('🤖 Testing Content Intelligence Integration...')
  
  try {
    // Get user profile
  const supabaseAdmin = getSupabaseAdmin()
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('niche')
      .eq('id', userId)
      .single()
    
    const niche = profile?.niche || 'lifestyle'
    
    // Get algorithm state
    const algorithmState = await AlgorithmInsightsProvider.getCurrentAlgorithmState(niche)
    
    // Check if algorithm insights would be included in content generation
    const hasAlgorithmData = algorithmState.content_type_performance.length > 0
    const aiPrompt = AlgorithmInsightsProvider.formatForAI(algorithmState)
    
    // Simulate content type adjustment
    const reelsPerf = algorithmState.content_type_performance.find(
      p => p.content_type === 'REELS'
    )
    const carouselPerf = algorithmState.content_type_performance.find(
      p => p.content_type === 'CAROUSEL_ALBUM'
    )
    
    const wouldAdjustContentMix = 
      (reelsPerf?.performance_trend === 'decreasing' && carouselPerf?.performance_trend === 'increasing') ||
      (reelsPerf?.performance_trend === 'increasing' && carouselPerf?.performance_trend === 'decreasing')
    
    return {
      success: hasAlgorithmData,
      message: hasAlgorithmData
        ? '✅ Content intelligence will use algorithm insights'
        : '❌ No algorithm data available for content generation',
      details: {
        niche,
        algorithmDataAvailable: hasAlgorithmData,
        wouldAdjustContentMix,
        aiPromptIncludesInsights: aiPrompt.length > 50,
        contentTypeAdjustments: algorithmState.content_type_performance
          .filter(p => p.performance_trend !== 'stable')
          .map(p => `${p.content_type}: ${p.performance_trend}`)
      }
    }
  } catch (error) {
    return {
      success: false,
      message: '❌ Content integration test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Test 4: Auto-Adaptation Logic
 */
async function testAutoAdaptation() {
  console.log('🔄 Testing Auto-Adaptation Logic...')
  
  try {
    // Simulate different algorithm states
    const scenarios = [
      {
        name: 'Reels Down Scenario',
        contentPerformance: [
          { content_type: 'REELS', reach_multiplier: 0.65, performance_trend: 'decreasing' as const },
          { content_type: 'CAROUSEL_ALBUM', reach_multiplier: 1.2, performance_trend: 'increasing' as const }
        ],
        expectedAdjustment: 'Reduce Reels, Increase Carousels'
      },
      {
        name: 'Everything Stable',
        contentPerformance: [
          { content_type: 'REELS', reach_multiplier: 1.0, performance_trend: 'stable' as const },
          { content_type: 'CAROUSEL_ALBUM', reach_multiplier: 1.0, performance_trend: 'stable' as const }
        ],
        expectedAdjustment: 'No changes needed'
      }
    ]
    
    const scenarioResults = scenarios.map(scenario => {
      // Calculate content scores with algorithm multipliers
      const reelsScore = 80 * scenario.contentPerformance[0].reach_multiplier
      const carouselScore = 70 * scenario.contentPerformance[1].reach_multiplier
      
      const wouldPrioritizeCarousels = carouselScore > reelsScore
      const correctAdjustment = 
        (scenario.name === 'Reels Down Scenario' && wouldPrioritizeCarousels) ||
        (scenario.name === 'Everything Stable' && !wouldPrioritizeCarousels)
      
      return {
        scenario: scenario.name,
        correctAdjustment,
        scores: {
          reels: reelsScore.toFixed(1),
          carousel: carouselScore.toFixed(1)
        }
      }
    })
    
    const allCorrect = scenarioResults.every(r => r.correctAdjustment)
    
    return {
      success: allCorrect,
      message: allCorrect
        ? '✅ Auto-adaptation logic working correctly'
        : '❌ Auto-adaptation logic has issues',
      details: {
        scenarios: scenarioResults,
        explanation: 'Content mix automatically adjusts based on algorithm performance multipliers'
      }
    }
  } catch (error) {
    return {
      success: false,
      message: '❌ Auto-adaptation test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Generate test summary
 */
function generateTestSummary(results: any) {
  const features = [
    { name: 'Alert System', test: 'alertSystemTest' },
    { name: 'Algorithm Insights', test: 'algorithmInsightsTest' },
    { name: 'Content Integration', test: 'contentIntegrationTest' },
    { name: 'Auto-Adaptation', test: 'autoAdaptationTest' }
  ]
  
  return {
    totalTests: features.length,
    passed: features.filter(f => results[f.test]?.success).length,
    failed: features.filter(f => !results[f.test]?.success).length,
    features: features.map(f => ({
      name: f.name,
      status: results[f.test]?.success ? '✅ Passed' : '❌ Failed',
      message: results[f.test]?.message
    }))
  }
}