import { NextRequest, NextResponse } from 'next/server'
import { TikTokCollector } from '@/lib/trends/tiktok-collector'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const niche = url.searchParams.get('niche') || 'lifestyle'
    
    console.log(`Fetching TikTok trends for niche: ${niche}`)
    
    const collector = new TikTokCollector()
    const trends = await collector.collectTrends(niche)
    
    // Store trends in database
    for (const trend of trends) {
      await supabaseAdmin
        .from('trends')
        .upsert({
          niche,
          trend_type: 'video',
          trend_name: trend.topic,
          confidence_score: trend.viral_score,
          growth_velocity: trend.viral_score * 10, // Simplified metric
          source: 'tiktok',
          metadata: {
            content_patterns: trend.content_patterns,
            instagram_potential: trend.instagram_potential,
            top_videos: trend.videos.slice(0, 2)
          }
        }, {
          onConflict: 'niche,trend_type,trend_name'
        })
    }
    
    return NextResponse.json({
      success: true,
      niche,
      trends,
      insights: generateTikTokInsights(trends),
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('TikTok trends error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch TikTok trends' },
      { status: 500 }
    )
  }
}

function generateTikTokInsights(trends: any[]): any {
  const highViralTrends = trends.filter(t => t.viral_score > 70)
  
  return {
    viral_topics: highViralTrends.map(t => ({
      topic: t.topic,
      instagram_strategy: getInstagramStrategy(t),
      content_ideas: generateContentIdeas(t)
    })),
    best_hooks: trends.flatMap(t => t.content_patterns.hooks).slice(0, 5),
    trending_formats: [...new Set(trends.flatMap(t => t.content_patterns.formats))],
    adaptation_tips: [
      'TikTok hooks work great as Instagram Reel openers',
      'Transform TikTok tutorials into Instagram carousel posts',
      'Use trending TikTok sounds in your Reels (if available)',
      'Adapt TikTok transitions for Instagram Reels'
    ]
  }
}

function getInstagramStrategy(trend: any): string {
  const strategies: Record<string, string> = {
    'morning routine': 'Create aesthetic morning routine Reels with calming music',
    'workout tips': 'Share quick workout tutorials as Reels + detailed carousel guides',
    'skincare': 'Before/after photos + ingredient breakdowns in carousels',
    'outfit ideas': 'Outfit transition Reels + styling tips in captions',
    'cooking hacks': 'Quick recipe Reels + save-worthy carousel recipes',
    'productivity': 'Time-lapse Reels + actionable carousel tips'
  }
  
  return strategies[trend.topic] || 'Create engaging Reels with trending audio'
}

function generateContentIdeas(trend: any): string[] {
  const ideas: string[] = []
  
  // Based on formats
  if (trend.content_patterns.formats.includes('Tutorial/How-to')) {
    ideas.push('Step-by-step carousel tutorial')
    ideas.push('60-second Reel tutorial with captions')
  }
  
  if (trend.content_patterns.formats.includes('Transformation')) {
    ideas.push('Before/after Reel with dramatic reveal')
    ideas.push('Progress photos in carousel format')
  }
  
  if (trend.content_patterns.formats.includes('Day in life/GRWM')) {
    ideas.push('Aesthetic day-in-life Reel')
    ideas.push('GRWM with product links in caption')
  }
  
  // Always add a general idea
  ideas.push(`"${trend.topic}" tips carousel with save-worthy design`)
  
  return ideas.slice(0, 3)
}