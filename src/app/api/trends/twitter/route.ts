import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withAuthAndValidation } from '@/lib/validation/middleware'

// GET Twitter trends from database
export const GET = withAuthAndValidation({})(
  async (request: NextRequest, userId: string) => {
    try {
      const supabaseAdmin = getSupabaseAdmin()
      
      // Get recent Twitter trends
      const { data: trends, error } = await supabaseAdmin
        .from('trend_analysis')
        .select('*')
        .eq('platform', 'twitter')
        .gte('collected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('confidence_score', { ascending: false })
        .limit(30)
      
      if (error) {
        console.error('Error fetching Twitter trends:', error)
        return NextResponse.json({ 
          success: false,
          error: 'Failed to fetch Twitter trends' 
        }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        trends: trends || [],
        count: trends?.length || 0,
        collected_at: new Date().toISOString()
      })
      
    } catch (error) {
      console.error('Twitter trends error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch Twitter trends' },
        { status: 500 }
      )
    }
  }
)