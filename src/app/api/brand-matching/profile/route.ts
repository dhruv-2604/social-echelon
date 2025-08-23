import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withAuthAndValidation, withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'

export const dynamic = 'force-dynamic'

// GET - Get user's brand matching profile (authenticated users only)
export const GET = withSecurityHeaders(
  rateLimit(20, 60000)( // 20 requests per minute
    withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
      try {
        const supabaseAdmin = getSupabaseAdmin()

        // Check if user has completed brand matching profile
        const { data: creatorProfile, error } = await supabaseAdmin
          .from('creator_profiles')
          .select(`
            user_id,
            onboarding_completed,
            profile_data,
            created_at,
            updated_at
          `)
          .eq('user_id', userId)
          .single()

        if (error || !creatorProfile) {
          return NextResponse.json({ 
            hasProfile: false,
            message: 'Brand matching profile not found'
          })
        }

        // Extract and sanitize profile data - only return what's needed for UI
        const profileData = creatorProfile.profile_data as any || {}
        const sanitizedProfile = {
          identity: {
            contentPillars: profileData.identity?.contentPillars?.slice(0, 10) || [],
            brandValues: profileData.identity?.brandValues?.slice(0, 15) || [],
            incomeLevel: profileData.identity?.incomeLevel || 'medium'
          },
          analytics: {
            growthRate: profileData.analytics?.growthRate || 0,
            ageRanges: profileData.analytics?.ageRanges?.slice(0, 5) || [],
            genderSplit: profileData.analytics?.genderSplit || { male: 0, female: 0, other: 0 },
            topLocations: profileData.analytics?.topLocations?.slice(0, 5) || []
          },
          professional: {
            monthlyGoal: profileData.professional?.monthlyGoal || 0,
            hoursPerWeek: profileData.professional?.hoursPerWeek || 0,
            skills: profileData.professional?.skills?.slice(0, 20) || [],
            languages: profileData.professional?.languages?.slice(0, 10) || []
          },
          preferences: {
            communicationPreference: profileData.wellbeing?.communicationPreference || 'email',
            maxBrandsPerMonth: profileData.wellbeing?.maxBrandsPerMonth || 5
          }
          // Don't expose sensitive data like past brands, dream brands, stress triggers, etc.
        }

        return NextResponse.json({ 
          hasProfile: true,
          profile: sanitizedProfile,
          onboardingCompleted: creatorProfile.onboarding_completed || false,
          profileCompleteness: calculateProfileCompleteness(sanitizedProfile)
        })

      } catch (error) {
        console.error('Error fetching creator profile:', error)
        return NextResponse.json(
          { error: 'Failed to fetch brand matching profile' },
          { status: 500 }
        )
      }
    })
  )
)

// Helper function to calculate profile completeness percentage
function calculateProfileCompleteness(profile: any): number {
  const checks = [
    profile.identity?.contentPillars?.length > 0,
    profile.identity?.brandValues?.length > 0,
    profile.identity?.incomeLevel,
    profile.analytics?.ageRanges?.length > 0,
    profile.professional?.monthlyGoal > 0,
    profile.professional?.hoursPerWeek > 0,
    profile.professional?.skills?.length > 0
  ]
  
  const completedChecks = checks.filter(Boolean).length
  return Math.round((completedChecks / checks.length) * 100)
}