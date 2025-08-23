import { NextRequest, NextResponse } from 'next/server'
import { PatternDetector } from '@/lib/intelligence/pattern-detector'
import { withAuthAndValidation, withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Helper to verify cron authorization
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  
  return isVercelCron || (!!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`)
}

// POST - Run pattern detection (cron-only)
export const POST = withSecurityHeaders(
  async (request: NextRequest) => {
    try {
      // Protected endpoint - only allow from cron jobs
      if (!verifyCronAuth(request)) {
        return NextResponse.json({ 
          error: 'Unauthorized - Cron authentication required' 
        }, { status: 401 })
      }

      // Restrict in production
      if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PATTERN_DETECTION) {
        return NextResponse.json({ 
          error: 'Pattern detection disabled in production' 
        }, { status: 403 })
      }

      const detector = new PatternDetector()
      const patterns = await detector.detectPatterns()

      return NextResponse.json({
        success: true,
        patterns_detected: patterns.length,
        timestamp: new Date().toISOString()
        // Don't expose detailed patterns in cron response
      })

    } catch (error) {
      console.error('Pattern detection error:', error)
      return NextResponse.json(
        { error: 'Failed to detect patterns' },
        { status: 500 }
      )
    }
  }
)

// Query parameters for pattern retrieval
const PatternQuerySchema = z.object({
  niche: z.string().min(1).max(50).optional(),
  type: z.enum(['caption_length', 'hashtag_count', 'posting_time', 'content_format']).optional()
}).optional()

// GET - Get discovered patterns (authenticated users only)
export const GET = withSecurityHeaders(
  rateLimit(30, 300000)( // 30 requests per 5 minutes
    withAuthAndValidation({
      query: PatternQuerySchema
    })(async (request: NextRequest, userId: string, { validatedQuery }) => {
      try {
        const niche = validatedQuery?.niche
        const patternType = validatedQuery?.type

        const { getSupabaseAdmin } = await import('@/lib/supabase-admin')
        const supabase = getSupabaseAdmin()

        let query = supabase
          .from('content_patterns')
          .select(`
            pattern_type,
            pattern_description,
            pattern_value,
            avg_performance_score,
            confidence_score,
            applicable_niches
          `)
          .eq('is_active', true)
          .gte('confidence_score', 70)
          .order('avg_performance_score', { ascending: false })

        if (patternType) {
          query = query.eq('pattern_type', patternType)
        }

        if (niche) {
          query = query.contains('applicable_niches', [niche])
        }

        const { data: patterns, error } = await query.limit(20)

        if (error) throw error

        // Sanitize patterns data
        const sanitizedPatterns = patterns?.map((pattern: any) => ({
          type: pattern.pattern_type,
          description: pattern.pattern_description,
          value: sanitizePatternValue(pattern.pattern_value),
          performance_score: Math.round(pattern.avg_performance_score || 0),
          confidence: Math.round(pattern.confidence_score || 0),
          niches: pattern.applicable_niches?.slice(0, 5) || []
        })) || []

        // Group patterns by type
        const groupedPatterns = sanitizedPatterns.reduce((acc: any, pattern) => {
          if (!acc[pattern.type]) {
            acc[pattern.type] = []
          }
          acc[pattern.type].push(pattern)
          return acc
        }, {})

        return NextResponse.json({
          success: true,
          total_patterns: sanitizedPatterns.length,
          patterns: groupedPatterns,
          summary: generatePatternSummary(sanitizedPatterns)
        })

      } catch (error) {
        console.error('Error fetching patterns:', error)
        return NextResponse.json(
          { error: 'Failed to fetch content patterns' },
          { status: 500 }
        )
      }
    })
  )
)

// Sanitize pattern values to prevent data exposure
function sanitizePatternValue(value: any): any {
  if (!value || typeof value !== 'object') return value
  
  // Remove sensitive fields and limit array sizes
  const sanitized = { ...value }
  
  if (Array.isArray(sanitized.examples)) {
    delete sanitized.examples // Remove example posts
  }
  
  if (Array.isArray(sanitized.user_ids)) {
    delete sanitized.user_ids // Remove user identification
  }
  
  if (Array.isArray(sanitized.post_ids)) {
    delete sanitized.post_ids // Remove post identification
  }
  
  return sanitized
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