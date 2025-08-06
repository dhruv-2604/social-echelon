import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { CreatorProfile } from '@/lib/brand-matching/creator-profile-schema'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const data = await request.json()

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

    // Transform the onboarding data to match our schema
    const creatorProfile: Partial<CreatorProfile> = {
      userId,
      instagramHandle: profile.instagram_username || '',
      analytics: {
        engagementRate: profile.engagement_rate || 0,
        avgLikes: avgLikes,
        avgComments: avgComments,
        avgViews: parseInt(data.analytics.avgLikes) || 0, // Using story views from form
        followerCount: profile.follower_count || 0,
        followerGrowthRate: parseFloat(data.analytics.growthRate),
        topPostingTimes: [], // Can be calculated later
        audienceDemographics: {
          ageRanges: data.analytics.ageRanges.map((r: any) => ({
            range: r.range,
            percentage: parseFloat(r.percentage)
          })),
          genderSplit: {
            male: parseFloat(data.analytics.genderSplit.male),
            female: parseFloat(data.analytics.genderSplit.female),
            other: parseFloat(data.analytics.genderSplit.other)
          },
          topLocations: data.analytics.topLocations,
          interests: [] // Will be enriched later
        }
      },
      identity: {
        contentPillars: data.identity.contentPillars,
        brandValues: data.identity.brandValues,
        pastBrands: data.identity.pastBrands,
        dreamBrands: data.identity.dreamBrands,
        blacklistBrands: data.identity.blacklistIndustries,
        contentStyle: {
          primaryFormat: 'reels', // Can be detected from content
          aestheticKeywords: data.identity.aestheticKeywords,
          captionStyle: 'storytelling', // Can be analyzed
          productionValue: 'authentic'
        },
        audiencePsychographics: {
          problems: data.identity.audienceProblems,
          aspirations: data.identity.audienceAspirations,
          incomeLevel: data.identity.incomeLevel as 'low' | 'medium' | 'high' | 'luxury',
          similarCreators: []
        }
      },
      professional: {
        currentIncomeSources: [], // Can be added in detailed onboarding
        incomeGoals: {
          realistic: parseInt(data.professional.monthlyGoal),
          stretch: parseInt(data.professional.monthlyGoal) * 1.5
        },
        availability: {
          hoursPerWeek: parseInt(data.professional.hoursPerWeek),
          turnaroundTime: 3 // Default 3 days
        },
        capabilities: {
          equipment: data.professional.equipment,
          skills: data.professional.skills,
          languages: data.professional.languages,
          travelRadius: parseInt(data.professional.travelRadius)
        }
      },
      wellbeing: {
        stressTriggers: data.wellbeing.stressTriggers,
        communicationPreference: data.wellbeing.communicationPreference as 'email' | 'phone' | 'text' | 'video',
        workLifeBalance: {
          maxBrandsPerMonth: parseInt(data.wellbeing.maxBrandsPerMonth),
          blackoutDates: [],
          preferredWorkHours: [data.wellbeing.preferredWorkHours]
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
}