import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withAuthAndValidation, withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Require explicit confirmation to prevent accidental deletion
const ResetConfirmationSchema = z.object({
  confirmReset: z.literal(true, {
    errorMap: () => ({ message: 'Must explicitly confirm reset with confirmReset: true' })
  }),
  resetType: z.enum(['insights', 'signals', 'both']).default('both')
})

export const POST = withSecurityHeaders(
  rateLimit(2, 86400000)( // Only 2 resets per day to prevent abuse
    withAuthAndValidation({
      body: ResetConfirmationSchema
    })(async (request: NextRequest, userId: string, { validatedBody }) => {
      try {
        if (!validatedBody) {
          return NextResponse.json({ 
            error: 'Request body required with confirmReset: true' 
          }, { status: 400 })
        }
        
        console.log(`Resetting ${validatedBody.resetType} for user:`, userId)
        
        const supabaseAdmin = getSupabaseAdmin()
        const deletedItems = {
          insights: 0,
          signals: 0
        }
        
        // Delete insights if requested
        if (validatedBody.resetType === 'insights' || validatedBody.resetType === 'both') {
          const { error: deleteError } = await supabaseAdmin
            .from('user_content_insights')
            .delete()
            .eq('user_id', userId)
          
          if (deleteError) {
            console.error('Error deleting insights:', deleteError)
            throw new Error('Failed to delete insights')
          }
          deletedItems.insights = 1 // We know at least some were deleted if no error
        }
        
        // Delete signals if requested
        if (validatedBody.resetType === 'signals' || validatedBody.resetType === 'both') {
          const { error: signalsError } = await supabaseAdmin
            .from('content_signals')
            .delete()
            .eq('user_id', userId)
          
          if (signalsError) {
            console.error('Error deleting signals:', signalsError)
            throw new Error('Failed to delete signals')
          }
          deletedItems.signals = 1 // We know at least some were deleted if no error
        }
        
        return NextResponse.json({
          success: true,
          message: `Reset completed successfully for ${validatedBody.resetType}.`,
          deletedItems,
          resetType: validatedBody.resetType
        })
        
      } catch (error) {
        console.error('Reset error:', error)
        return NextResponse.json(
          { error: 'Failed to reset insights' },
          { status: 500 }
        )
      }
    })
  )
)