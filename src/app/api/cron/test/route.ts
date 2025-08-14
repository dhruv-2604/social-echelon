import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Simple test endpoint to verify cron functionality
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const timestamp = new Date().toISOString()
    
    // Log this test run in the job_queue table as evidence
    const { error } = await supabase
      .from('job_queue')
      .insert({
        type: 'cron_test',
        status: 'completed',
        data: { 
          message: 'Cron test successful',
          timestamp,
          headers: Object.fromEntries(request.headers.entries())
        },
        completed_at: timestamp
      })
    
    if (error) {
      console.error('Error logging test:', error)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Cron test endpoint working',
      timestamp,
      note: 'Check job_queue table for cron_test entries'
    })
    
  } catch (error) {
    console.error('Cron test error:', error)
    return NextResponse.json(
      { error: 'Cron test failed', details: error },
      { status: 500 }
    )
  }
}