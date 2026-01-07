import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireUserType, withSecurityHeaders } from '@/lib/validation/middleware'

export const POST = withSecurityHeaders(
  requireUserType('brand')(
    async (request: NextRequest, userId: string) => {
      try {
        const body = await request.json()
        const { company, preferences } = body

        const supabaseAdmin = getSupabaseAdmin()

        // Update brand_profiles with company details
        const { error: brandProfileError } = await supabaseAdmin
          .from('brand_profiles')
          .update({
            description: company.description || null,
            company_size: company.size || null,
            social_links: company.socialLinks || null,
            onboarding_completed: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (brandProfileError) {
          console.error('Error updating brand profile:', brandProfileError)
          return NextResponse.json(
            { error: 'Failed to save company details' },
            { status: 500 }
          )
        }

        // Store campaign preferences in brand_profiles as well
        const { error: preferencesError } = await supabaseAdmin
          .from('brand_profiles')
          .update({
            campaign_preferences: {
              campaign_types: preferences.campaignTypes || [],
              budget_range: preferences.budgetRange || null,
              target_niches: preferences.targetNiches || [],
              target_follower_range: preferences.targetFollowerRange || null,
              preferred_locations: preferences.preferredLocations || [],
              content_themes: preferences.contentThemes || []
            }
          })
          .eq('user_id', userId)

        if (preferencesError) {
          console.error('Error saving campaign preferences:', preferencesError)
          // Non-fatal - continue anyway
        }

        return NextResponse.json({
          success: true,
          message: 'Brand onboarding completed successfully'
        })

      } catch (error) {
        console.error('Brand onboarding error:', error)
        return NextResponse.json(
          { error: 'Failed to complete onboarding' },
          { status: 500 }
        )
      }
    }
  )
)
