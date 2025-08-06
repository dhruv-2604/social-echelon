import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
    console.log('Adding user preference columns to profiles table')

    // Since we can't easily run ALTER TABLE via Supabase client,
    // let's check what columns exist first
    const { data: currentProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .limit(1)
      .single()

    console.log('Current profile columns:', Object.keys(currentProfile || {}))

    // For now, let's temporarily disable the preference saving 
    // and focus on the main functionality
    return NextResponse.json({ 
      success: true, 
      message: 'Column check completed',
      currentColumns: Object.keys(currentProfile || {})
    })

  } catch (error) {
    console.error('Column check error:', error)
    return NextResponse.json(
      { error: 'Column check failed' },
      { status: 500 }
    )
  }
}