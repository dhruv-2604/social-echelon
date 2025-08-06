import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { BrandOpportunityScraper } from '@/lib/brand-discovery/web-scraper'

// This endpoint should be called by a cron job (e.g., Vercel Cron)
export async function POST(request: NextRequest) {
  try {
    // Check for cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Also allow admin users to trigger manually
      const cookieStore = await cookies()
      const userId = cookieStore.get('user_id')?.value
      
      if (userId) {
  const supabaseAdmin = getSupabaseAdmin()
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single() as { data: any; error: any }
        
        if (profile?.role !== 'admin') {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
      } else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
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
      message: 'Scraping completed successfully'
    })
    
  } catch (error) {
    console.error('Error in scraping endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to run scraping' },
      { status: 500 }
    )
  }
}

// GET endpoint to view recent scraped opportunities
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Check if user is admin
    const supabaseAdmin = getSupabaseAdmin()
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single() as { data: any; error: any }
    
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    // Get recent qualified opportunities
    const { data: opportunities } = await supabaseAdmin
      .from('scraped_opportunities')
      .select('*')
      .eq('status', 'qualified')
      .order('created_at', { ascending: false })
      .limit(50) as { data: any[] | null; error: any }
    
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
      brands_to_research: brandQueue?.length || 0
    })
    
  } catch (error) {
    console.error('Error fetching scraped opportunities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch opportunities' },
      { status: 500 }
    )
  }
}