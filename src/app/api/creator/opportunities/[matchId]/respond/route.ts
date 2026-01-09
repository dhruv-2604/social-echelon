import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireUserType, withSecurityHeaders } from '@/lib/validation/middleware'
import { notifyBrandOfResponse, updateCreatorPartnershipCount } from '@/lib/partnership-matching'
import { createRelayForMatch } from '@/lib/messaging'
import { z } from 'zod'

const ResponseSchema = z.object({
  response: z.enum(['yes', 'no', 'maybe']),
  declineReason: z.string().optional()
})

/**
 * POST /api/creator/opportunities/[matchId]/respond
 * Submit creator's response to a brief match
 */
export const POST = withSecurityHeaders(
  requireUserType('creator')(
    async (request: NextRequest, userId: string) => {
      try {
        // Extract matchId from URL
        const url = new URL(request.url)
        const pathParts = url.pathname.split('/')
        const matchIdIndex = pathParts.findIndex(p => p === 'opportunities') + 1
        const matchId = pathParts[matchIdIndex]

        if (!matchId) {
          return NextResponse.json(
            { error: 'Match ID is required' },
            { status: 400 }
          )
        }

        const body = await request.json()
        const validation = ResponseSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { error: 'Invalid response data', details: validation.error.errors },
            { status: 400 }
          )
        }

        const { response, declineReason } = validation.data
        const supabaseAdmin = getSupabaseAdmin()

        // Verify the match belongs to this creator and is pending
        const { data: matchData, error: matchError } = await supabaseAdmin
          .from('brief_matches')
          .select('id, brief_id, creator_user_id, creator_response')
          .eq('id', matchId)
          .single()

        if (matchError || !matchData) {
          return NextResponse.json(
            { error: 'Match not found' },
            { status: 404 }
          )
        }

        const match = matchData as {
          id: string
          brief_id: string
          creator_user_id: string
          creator_response: string
        }

        if (match.creator_user_id !== userId) {
          return NextResponse.json(
            { error: 'Not authorized to respond to this match' },
            { status: 403 }
          )
        }

        if (match.creator_response !== 'pending') {
          return NextResponse.json(
            { error: 'Already responded to this opportunity' },
            { status: 400 }
          )
        }

        // Fetch the brief separately
        const { data: briefData, error: briefError } = await supabaseAdmin
          .from('campaign_briefs')
          .select('id, title, brand_user_id, status')
          .eq('id', match.brief_id)
          .single()

        if (briefError || !briefData) {
          return NextResponse.json(
            { error: 'This opportunity is no longer available' },
            { status: 400 }
          )
        }

        const brief = briefData as {
          id: string
          title: string
          brand_user_id: string
          status: string
        }

        if (brief.status !== 'active') {
          return NextResponse.json(
            { error: 'This opportunity is no longer available' },
            { status: 400 }
          )
        }

        // Update the match with the response
        const updateData: {
          creator_response: string
          response_at: string
          partnership_status: string
          decline_reason?: string
        } = {
          creator_response: response,
          response_at: new Date().toISOString(),
          partnership_status: response === 'yes' ? 'negotiating' : 'closed'
        }

        if (response === 'no' && declineReason) {
          updateData.decline_reason = declineReason
        }

        const { error: updateError } = await supabaseAdmin
          .from('brief_matches')
          .update(updateData)
          .eq('id', matchId)

        if (updateError) {
          console.error('Error updating match response:', updateError)
          return NextResponse.json(
            { error: 'Failed to submit response' },
            { status: 500 }
          )
        }

        // If creator said yes, increment their partnership count and create relay
        let relayEmail: string | undefined
        if (response === 'yes') {
          await updateCreatorPartnershipCount(supabaseAdmin, userId, true)

          // Create message relay for brand-creator communication
          const relayResult = await createRelayForMatch({
            matchId,
            briefId: brief.id,
            brandUserId: brief.brand_user_id,
            creatorUserId: userId
          })

          if (relayResult.success && relayResult.relayEmail) {
            relayEmail = relayResult.relayEmail
          } else {
            console.error('Failed to create relay:', relayResult.error)
            // Don't fail the response - relay is nice-to-have, not critical
          }
        }

        // Get creator name for notification
        const { data: creatorProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, instagram_username')
          .eq('id', userId)
          .single()

        const creatorName = (creatorProfile as { full_name: string | null; instagram_username: string | null } | null)?.full_name ||
          (creatorProfile as { full_name: string | null; instagram_username: string | null } | null)?.instagram_username ||
          'A creator'

        // Notify the brand
        await notifyBrandOfResponse(
          supabaseAdmin,
          brief.id,
          brief.brand_user_id,
          creatorName,
          response
        )

        return NextResponse.json({
          success: true,
          message: response === 'yes'
            ? 'Great! The brand has been notified of your interest.'
            : response === 'no'
              ? 'Response recorded. We\'ll find better opportunities for you.'
              : 'The brand will provide more information soon.',
          response,
          relayEmail // Included so brand can contact creator via relay
        })

      } catch (error) {
        console.error('Response submission error:', error)
        return NextResponse.json(
          { error: 'Failed to submit response' },
          { status: 500 }
        )
      }
    }
  )
)
