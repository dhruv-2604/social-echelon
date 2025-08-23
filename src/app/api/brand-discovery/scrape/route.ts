import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withValidation, withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'
import { ManualScrapingSchema } from '@/lib/validation/schemas'
import { BrandOpportunityScraper } from '@/lib/brand-discovery/web-scraper'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Helper function to verify cron or admin access
async function verifyCronOrAdminAccess(request: NextRequest): Promise<boolean> {
  // Check for cron secret first
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true
  }

  // Check for admin user
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    
    if (!userId) return false
    
    // Basic userId validation to prevent injection
    if (!/^[a-zA-Z0-9-_]+$/.test(userId)) return false

    const supabaseAdmin = getSupabaseAdmin()
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single() as { data: any; error: any }
    
    return profile?.role === 'admin'
  } catch {
    return false
  }
}

export const POST = withSecurityHeaders(
  rateLimit(5, 3600000)( // 5 requests per hour (expensive scraping operation)
    withValidation({
      body: ManualScrapingSchema
    })(async (request: NextRequest, { validatedBody }) => {
    try {
      // Verify authorization
      const hasAccess = await verifyCronOrAdminAccess(request)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    
      const scraper = new BrandOpportunityScraper()
      const results = await scraper.runDailyScraping()
      
      // Get summary of scraped opportunities
      const supabaseAdmin = getSupabaseAdmin()
      const { data: summary } = await supabaseAdmin
        .from('scraped_opportunities')
        .select('opportunity_type, status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) as { data: any[] | null; error: any }
      
      const stats = {
        total_scraped: summary?.length || 0,
        by_type: summary?.reduce((acc, item) => {
          acc[item.opportunity_type] = (acc[item.opportunity_type] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        qualified: summary?.filter(s => s.status === 'qualified').length || 0
      }
      
      return NextResponse.json({
        success: true,
        results,
        stats,
        message: 'Scraping completed successfully',
        config: validatedBody || {}
      })
      
    } catch (error) {
      console.error('Error in scraping endpoint:', error)
      return NextResponse.json(
        { error: 'Failed to run scraping' },
        { status: 500 }
      )
    }
    })
  )
)

export const GET = withSecurityHeaders(
  async (request: NextRequest) => {
    try {
      // Verify admin access
      const hasAccess = await verifyCronOrAdminAccess(request)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }

      // Parse and validate query parameters
      const url = new URL(request.url)
      
      // Parse limit parameter
      let limit = 50
      const limitParam = url.searchParams.get('limit')
      if (limitParam) {
        const parsed = parseInt(limitParam)
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
          limit = parsed
        }
      }
      
      // Parse status parameter
      const statusParam = url.searchParams.get('status')
      const validStatuses = ['all', 'qualified', 'pending', 'rejected']
      const status = validStatuses.includes(statusParam || '') ? statusParam : 'qualified'

      const supabaseAdmin = getSupabaseAdmin()
      
      // Build query based on status filter
      let opportunitiesQuery = supabaseAdmin
        .from('scraped_opportunities')
        .select('*')
      
      if (status !== 'all' && status) {
        opportunitiesQuery = opportunitiesQuery.eq('status', status)
      }
      
      const { data: opportunities } = await opportunitiesQuery
        .order('created_at', { ascending: false })
        .limit(limit) as { data: any[] | null; error: any }
      
      // Get brands in queue
      const { data: brandQueue } = await supabaseAdmin
        .from('scraping_brand_queue')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .limit(20) as { data: any[] | null; error: any }
      
      return NextResponse.json({
        opportunities,
        brand_queue: brandQueue,
        total_opportunities: opportunities?.length || 0,
        brands_to_research: brandQueue?.length || 0,
        filters: { status, limit }
      })
      
    } catch (error) {
      console.error('Error fetching scraped opportunities:', error)
      return NextResponse.json(
        { error: 'Failed to fetch opportunities' },
        { status: 500 }
      )
    }
  }
)