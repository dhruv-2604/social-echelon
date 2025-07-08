import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('Running database migration to add user preferences columns')

    // Add user preferences columns to profiles table using direct SQL execution
    const { data: result1, error: error1 } = await supabaseAdmin
      .rpc('sql', { query: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS primary_goal TEXT` })
    
    const { data: result2, error: error2 } = await supabaseAdmin
      .rpc('sql', { query: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS content_style TEXT` })
    
    const { data: result3, error: error3 } = await supabaseAdmin
      .rpc('sql', { query: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_audience TEXT` })
    
    const { data: result4, error: error4 } = await supabaseAdmin
      .rpc('sql', { query: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS voice_tone TEXT` })
    
    const { data: result5, error: error5 } = await supabaseAdmin
      .rpc('sql', { query: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS posting_frequency INTEGER DEFAULT 3` })
    
    const { data: result6, error: error6 } = await supabaseAdmin
      .rpc('sql', { query: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences_set BOOLEAN DEFAULT FALSE` })

    const errors = [error1, error2, error3, error4, error5, error6].filter(e => e)
    if (errors.length > 0) {
      console.error('Some migration errors:', errors)
    }

    console.log('Database migration completed successfully')
    return NextResponse.json({ success: true, message: 'Database migration completed' })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'Migration failed' },
      { status: 500 }
    )
  }
}