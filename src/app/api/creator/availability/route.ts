import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireUserType, withSecurityHeaders } from '@/lib/validation/middleware'

// GET - Fetch current availability settings
export const GET = withSecurityHeaders(
  requireUserType('creator')(
    async (request: NextRequest, userId: string) => {
      try {
        const supabaseAdmin = getSupabaseAdmin()

        const { data: profile, error } = await supabaseAdmin
          .from('profiles')
          .select('actively_seeking, partnership_capacity, current_partnerships, min_budget, preferred_campaign_types, availability_updated_at')
          .eq('id', userId)
          .single()

        if (error) {
          console.error('Error fetching availability:', error)
          return NextResponse.json(
            { error: 'Failed to fetch availability settings' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          availability: {
            actively_seeking: profile.actively_seeking ?? true,
            partnership_capacity: profile.partnership_capacity ?? 3,
            current_partnerships: profile.current_partnerships ?? 0,
            min_budget: profile.min_budget ?? 100,
            preferred_campaign_types: profile.preferred_campaign_types ?? [],
            availability_updated_at: profile.availability_updated_at
          }
        })

      } catch (error) {
        console.error('Availability fetch error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch availability' },
          { status: 500 }
        )
      }
    }
  )
)

// PATCH - Update availability settings
export const PATCH = withSecurityHeaders(
  requireUserType('creator')(
    async (request: NextRequest, userId: string) => {
      try {
        const body = await request.json()
        const {
          actively_seeking,
          partnership_capacity,
          min_budget,
          preferred_campaign_types
        } = body

        const supabaseAdmin = getSupabaseAdmin()

        const updateData: Record<string, any> = {
          availability_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Only update fields that are provided
        if (typeof actively_seeking === 'boolean') {
          updateData.actively_seeking = actively_seeking
        }
        if (typeof partnership_capacity === 'number') {
          updateData.partnership_capacity = Math.min(Math.max(1, partnership_capacity), 10)
        }
        if (typeof min_budget === 'number') {
          updateData.min_budget = Math.max(0, min_budget)
        }
        if (Array.isArray(preferred_campaign_types)) {
          updateData.preferred_campaign_types = preferred_campaign_types
        }

        const { error } = await supabaseAdmin
          .from('profiles')
          .update(updateData)
          .eq('id', userId)

        if (error) {
          console.error('Error updating availability:', error)
          return NextResponse.json(
            { error: 'Failed to update availability settings' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Availability settings updated successfully'
        })

      } catch (error) {
        console.error('Availability update error:', error)
        return NextResponse.json(
          { error: 'Failed to update availability' },
          { status: 500 }
        )
      }
    }
  )
)
