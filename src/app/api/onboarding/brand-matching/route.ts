import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withAuthAndValidation, withSecurityHeaders } from '@/lib/validation/middleware'
import { CreatorOnboardingSchema } from '@/lib/validation/schemas'
import { CreatorProfile } from '@/lib/brand-matching/creator-profile-schema'

export const dynamic = 'force-dynamic'

export const POST = withSecurityHeaders(
  withAuthAndValidation({
    body: CreatorOnboardingSchema as any
  })(async (request: NextRequest, userId: string, { validatedBody }) => {
    try {
      if (!validatedBody) {
        return NextResponse.json({ error: 'Request body is required' }, { status: 400 })
      }

    const supabaseAdmin = getSupabaseAdmin()

    // Get existing profile data to pull follower count and engagement rate
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('instagram_username, follower_count, engagement_rate')
      .eq('id', userId)
      .single() as { data: any; error: any }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Calculate average likes/comments from recent posts
    const { data: recentPosts } = await supabaseAdmin
      .from('instagram_posts')
      .select('likes_count, comments_count')
      .eq('profile_id', userId)
      .order('timestamp', { ascending: false })
      .limit(20) as { data: Array<{likes_count: number; comments_count: number}> | null; error: any }

    const avgLikes = recentPosts && recentPosts.length > 0 ? Math.round(recentPosts.reduce((sum, post) => sum + (post.likes_count || 0), 0) / recentPosts.length) : 0
    const avgComments = recentPosts && recentPosts.length > 0 ? Math.round(recentPosts.reduce((sum, post) => sum + (post.comments_count || 0), 0) / recentPosts.length) : 0

    // Transform the validated onboarding data to match our schema
    const creatorProfile: Partial<CreatorProfile> = {
      userId,
      instagramHandle: profile.instagram_username || '',
      analytics: {
        engagementRate: profile.engagement_rate || 0,
        avgLikes: avgLikes,
        avgComments: avgComments,
        avgViews: validatedBody.analytics.avgLikes || 0, // Using story views from form
        followerCount: profile.follower_count || 0,
        followerGrowthRate: validatedBody.analytics.growthRate,
        topPostingTimes: [], // Can be calculated later
        audienceDemographics: {
          ageRanges: validatedBody.analytics.ageRanges.map((r: any) => ({
            range: r.range,
            percentage: r.percentage
          })),
          genderSplit: {
            male: validatedBody.analytics.genderSplit.male,
            female: validatedBody.analytics.genderSplit.female,
            other: validatedBody.analytics.genderSplit.other
          },
          topLocations: validatedBody.analytics.topLocations,
          interests: [] // Will be enriched later
        }
      },
      identity: {
        contentPillars: validatedBody.identity.contentPillars,
        brandValues: validatedBody.identity.brandValues,
        pastBrands: validatedBody.identity.pastBrands,
        dreamBrands: validatedBody.identity.dreamBrands,
        blacklistBrands: validatedBody.identity.blacklistIndustries,
        contentStyle: {
          primaryFormat: 'reels', // Can be detected from content
          aestheticKeywords: validatedBody.identity.aestheticKeywords,
          captionStyle: 'storytelling', // Can be analyzed
          productionValue: 'authentic'
        },
        audiencePsychographics: {
          problems: validatedBody.identity.audienceProblems,
          aspirations: validatedBody.identity.audienceAspirations,
          incomeLevel: validatedBody.identity.incomeLevel,
          similarCreators: []
        }
      },
      professional: {
        currentIncomeSources: [], // Can be added in detailed onboarding
        incomeGoals: {
          realistic: validatedBody.professional.monthlyGoal,
          stretch: validatedBody.professional.monthlyGoal * 1.5
        },
        availability: {
          hoursPerWeek: validatedBody.professional.hoursPerWeek,
          turnaroundTime: 3 // Default 3 days
        },
        capabilities: {
          equipment: validatedBody.professional.equipment,
          skills: validatedBody.professional.skills,
          languages: validatedBody.professional.languages,
          travelRadius: validatedBody.professional.travelRadius
        }
      },
      wellbeing: {
        stressTriggers: validatedBody.wellbeing.stressTriggers,
        communicationPreference: validatedBody.wellbeing.communicationPreference,
        workLifeBalance: {
          maxBrandsPerMonth: validatedBody.wellbeing.maxBrandsPerMonth,
          blackoutDates: [],
          preferredWorkHours: [validatedBody.wellbeing.preferredWorkHours]
        },
        supportNeeds: []
      },
      scores: {
        contentDNA: {
          colorPalette: [], // Will be analyzed from content
          compositionStyle: '',
          emotionalTone: [],
          engagementTriggers: []
        },
        audienceValue: {
          purchaseIntent: 0, // Will be calculated
          brandAffinity: 0,
          communityLoyalty: 0,
          influenceScore: 0
        },
        nicheAuthority: {} // Will be calculated based on content
      },
      completionStatus: {
        analytics: true,
        identity: true,
        professional: true,
        wellbeing: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Instagram handle already set from profile query above

    // Store the creator profile
    const { error: insertError } = await supabaseAdmin
      .from('creator_profiles')
      .upsert({
        user_id: userId,
        profile_data: creatorProfile,
        onboarding_completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Error saving creator profile:', insertError)
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
    }

    // Update user profile to indicate brand matching is enabled
    await supabaseAdmin
      .from('profiles')
      .update({
        brand_matching_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    // Trigger initial brand matching process (async)
    // This would normally trigger a background job
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/brand-matching/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    }).catch(console.error)

    return NextResponse.json({ 
      success: true,
      message: 'Profile created successfully. We\'re finding your perfect brand matches!'
    })

    } catch (error) {
      console.error('Onboarding error:', error)
      return NextResponse.json(
        { error: 'Failed to complete onboarding' },
        { status: 500 }
      )
    }
  })
)