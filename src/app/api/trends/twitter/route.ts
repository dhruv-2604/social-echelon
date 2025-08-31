import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withAuthAndValidation } from '@/lib/validation/middleware'

// GET Twitter trends from database (global for all users)
export const GET = withAuthAndValidation({})(
  async (request: NextRequest, userId: string) => {
    try {
      const supabaseAdmin = getSupabaseAdmin()
      const SYSTEM_USER_ID = 'aa3a46a6-ceca-4a83-bdfa-5b3b241731a5'
      
      // Get recent Twitter trends (global)
      const { data: trends, error } = await supabaseAdmin
        .from('trend_analysis')
        .select('*')
        .eq('user_id', SYSTEM_USER_ID)  // Use SYSTEM_USER_ID for global trends
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