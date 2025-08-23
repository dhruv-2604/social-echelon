import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withAuthAndValidation, withSecurityHeaders } from '@/lib/validation/middleware'

export const dynamic = 'force-dynamic'

// POST - Admin-only database column management
export const POST = withSecurityHeaders(
  withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
    try {
      // Check if user is admin
      const supabaseAdmin = getSupabaseAdmin()
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (profile?.role !== 'admin') {
        return NextResponse.json({ 
          error: 'Admin access required for database operations' 
        }, { status: 403 })
      }

      // Restrict in production
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ 
          error: 'Database operations not allowed in production' 
        }, { status: 403 })
      }

      // Since we can't easily run ALTER TABLE via Supabase client,
      // let's check what columns exist first
      const { data: currentProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .limit(1)
        .single()

      return NextResponse.json({ 
        success: true, 
        message: 'Column check completed'
        // Don't expose database structure to client
      })

    } catch (error) {
      console.error('Column check error:', error)
      return NextResponse.json(
        { error: 'Database operation failed' },
        { status: 500 }
      )
    }
  })
)