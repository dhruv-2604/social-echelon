import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('Clearing content plans for user:', userId)

    // Delete all content plans for this user
    const { error } = await supabaseAdmin
      .from('content_plans')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('Error clearing content plans:', error)
      return NextResponse.json({ error: 'Failed to clear content plans' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Content plans cleared successfully'
    })

  } catch (error) {
    console.error('Error in clear-content-plans:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}