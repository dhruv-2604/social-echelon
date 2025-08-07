import { NextRequest, NextResponse } from 'next/server'
import { PatternDetector } from '@/lib/intelligence/pattern-detector'

export const dynamic = 'force-dynamic'

// POST /api/intelligence/patterns - Detect patterns (scheduled job)
export async function POST(request: NextRequest) {
  try {
    // Protected endpoint - only allow from cron jobs
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting pattern detection...')

    const detector = new PatternDetector()
    const patterns = await detector.detectPatterns()

    return NextResponse.json({
      success: true,
      patterns_detected: patterns.length,
      patterns: patterns.map(p => ({
        type: p.pattern_type,
        description: p.pattern_description,
        score: p.avg_performance_score,
        confidence: p.confidence_score
      })),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Pattern detection error:', error)
    return NextResponse.json(
      { error: 'Failed to detect patterns' },
      { status: 500 }
    )
  }
}

// GET /api/intelligence/patterns - Get discovered patterns
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const niche = url.searchParams.get('niche')
    const patternType = url.searchParams.get('type')

    const { getSupabaseAdmin } = await import('@/lib/supabase-admin')
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('content_patterns')
      .select('*')
      .eq('is_active', true)
      .gte('confidence_score', 70)
      .order('avg_performance_score', { ascending: false })

    if (patternType) {
      query = query.eq('pattern_type', patternType)
    }

    if (niche) {
      query = query.contains('applicable_niches', [niche])
    }

    const { data: patterns, error } = await query.limit(20) as { 
      data: Array<{
        pattern_type: string;
        pattern_description: string;
        pattern_value: any;
        avg_performance_score: number;
        confidence_score: number;
        applicable_niches: string[];
        is_active: boolean;
      }> | null;
      error: any;
    }

    if (error) throw error

    // Group patterns by type
    const groupedPatterns = patterns?.reduce((acc: any, pattern) => {
      if (!acc[pattern.pattern_type]) {
        acc[pattern.pattern_type] = []
      }
      acc[pattern.pattern_type].push(pattern)
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      total_patterns: patterns?.length || 0,
      patterns: groupedPatterns,
      summary: generatePatternSummary(patterns || [])
    })

  } catch (error) {
    console.error('Error fetching patterns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch patterns' },
      { status: 500 }
    )
  }
}

function generatePatternSummary(patterns: any[]): any {
  if (patterns.length === 0) return {}

  const summary: any = {}

  // Find best caption length
  const captionPatterns = patterns.filter(p => p.pattern_type === 'caption_length')
  if (captionPatterns.length > 0) {
    const best = captionPatterns[0]
    summary.optimal_caption_range = best.pattern_value
  }

  // Find best hashtag count
  const hashtagPatterns = patterns.filter(p => p.pattern_type === 'hashtag_count')
  if (hashtagPatterns.length > 0) {
    const best = hashtagPatterns[0]
    summary.optimal_hashtag_count = best.pattern_value.optimal
  }

  // Find best posting times
  const timingPatterns = patterns.filter(p => p.pattern_type === 'posting_time')
  if (timingPatterns.length > 0) {
    const best = timingPatterns[0]
    summary.best_posting_hours = best.pattern_value.best_hours
  }

  // Find best format
  const formatPatterns = patterns.filter(p => p.pattern_type === 'content_format')
  if (formatPatterns.length > 0) {
    const best = formatPatterns[0]
    summary.best_content_format = best.pattern_value.format
  }

  return summary
}