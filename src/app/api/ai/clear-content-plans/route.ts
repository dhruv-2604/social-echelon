import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withAuthAndValidation, withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Require confirmation to prevent accidental deletion
const ClearPlansSchema = z.object({
  confirmClear: z.literal(true, {
    errorMap: () => ({ message: 'Must explicitly confirm with confirmClear: true' })
  }),
  olderThanDays: z.number().min(0).max(365).optional() // Optional: only clear plans older than X days
})

export const DELETE = withSecurityHeaders(
  rateLimit(5, 86400000)( // Only 5 clears per day
    withAuthAndValidation({
      body: ClearPlansSchema
    })(async (request: NextRequest, userId: string, { validatedBody }) => {
      try {
        if (!validatedBody) {
          return NextResponse.json({ 
            error: 'Request body required with confirmClear: true' 
          }, { status: 400 })
        }

        const supabaseAdmin = getSupabaseAdmin()
        
        console.log('Clearing content plans for user:', userId)

        // Build query based on age filter
        let query = supabaseAdmin
          .from('content_plans')
          .delete()
          .eq('user_id', userId)
          
        // If olderThanDays is specified, only delete old plans
        if (validatedBody.olderThanDays !== undefined) {
          const cutoffDate = new Date()
          cutoffDate.setDate(cutoffDate.getDate() - validatedBody.olderThanDays)
          query = query.lt('generated_at', cutoffDate.toISOString())
          
          console.log(`Deleting plans older than ${validatedBody.olderThanDays} days`)
        }

        // Get count before deletion for feedback
        const { count: beforeCount } = await supabaseAdmin
          .from('content_plans')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)

        // Execute deletion (delete doesn't return count in Supabase)
        const { error } = await query

        if (error) {
          console.error('Error clearing content plans:', error)
          return NextResponse.json({ 
            error: 'Failed to clear content plans' 
          }, { status: 500 })
        }

        // Get count after deletion to calculate how many were deleted
        const { count: afterCount } = await supabaseAdmin
          .from('content_plans')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)

        const deletedCount = (beforeCount || 0) - (afterCount || 0)

        return NextResponse.json({
          success: true,
          message: `Successfully deleted ${deletedCount} content plans`,
          deletedCount,
          previousTotal: beforeCount || 0,
          remainingTotal: afterCount || 0,
          filterApplied: validatedBody.olderThanDays 
            ? `Plans older than ${validatedBody.olderThanDays} days` 
            : 'All plans'
        })

      } catch (error) {
        console.error('Error in clear-content-plans:', error)
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    })
  )
)