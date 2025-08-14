import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PerformanceCollector } from '@/lib/algorithm/performance-collector'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Manual trigger for data collection - for testing/debugging
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const supabase = getSupabaseAdmin()
    
    // Check current data
    const today = new Date().toISOString().split('T')[0]
    const { data: existingData } = await supabase
      .from('user_performance_summary')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()
    
    console.log('Existing data for today:', existingData)
    
    // Collect fresh data
    console.log('Manually collecting data for user:', userId)
    const collector = new PerformanceCollector()
    const summary = await collector.collectDailySummary(userId)
    
    if (!summary) {
      return NextResponse.json({ 
        error: 'Failed to collect data',
        note: 'Check if Instagram token is valid and posts exist'
      }, { status: 500 })
    }
    
    // Verify it was saved
    const { data: newData } = await supabase
      .from('user_performance_summary')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()
    
    return NextResponse.json({
      success: true,
      message: 'Manual collection completed',
      existingDataBefore: existingData,
      collectedSummary: summary,
      savedData: newData,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Manual collection error:', error)
    return NextResponse.json(
      { 
        error: 'Manual collection failed', 
        details: error instanceof Error ? error.message : error 
      },
      { status: 500 }
    )
  }
}

// POST to collect for ALL users (admin function)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    console.log('Manually collecting data for ALL users (initiated by:', userId, ')')
    
    const collector = new PerformanceCollector()
    await collector.collectAllUsersSummaries()
    
    return NextResponse.json({
      success: true,
      message: 'Manual collection for all users completed',
      initiatedBy: userId,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Manual collection error:', error)
    return NextResponse.json(
      { 
        error: 'Manual collection failed', 
        details: error instanceof Error ? error.message : error 
      },
      { status: 500 }
    )
  }
}