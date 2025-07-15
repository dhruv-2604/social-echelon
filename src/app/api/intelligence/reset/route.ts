import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    console.log('Resetting insights for user:', userId)
    
    // Delete existing insights
    const { error: deleteError } = await supabaseAdmin
      .from('user_content_insights')
      .delete()
      .eq('user_id', userId)
    
    if (deleteError) {
      console.error('Error deleting insights:', deleteError)
    }
    
    // Delete existing content signals  
    const { error: signalsError } = await supabaseAdmin
      .from('content_signals')
      .delete()
      .eq('user_id', userId)
    
    if (signalsError) {
      console.error('Error deleting signals:', signalsError)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Insights reset. Click "Analyze My Content" to regenerate.'
    })
    
  } catch (error) {
    console.error('Reset error:', error)
    return NextResponse.json(
      { error: 'Failed to reset insights' },
      { status: 500 }
    )
  }
}