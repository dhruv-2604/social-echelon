import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ContentGenerator, UserProfile } from '@/lib/ai/content-generator'
import { ContentAnalyzer } from '@/lib/ai/content-analyzer'
import { InstagramAPI } from '@/lib/instagram'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('Generating content plan for user:', userId)

    // Get user profile and preferences
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get user's content preferences (with defaults)
    const body = await request.json()
    const userProfile: UserProfile = {
      niche: body.niche || profile.niche || 'lifestyle',
      primary_goal: body.primary_goal || profile.primary_goal || 'growth',
      content_style: body.content_style || profile.content_style || 'authentic',
      target_audience: body.target_audience || profile.target_audience || 'young professionals and entrepreneurs',
      voice_tone: body.voice_tone || profile.voice_tone || 'casual',
      posting_frequency: body.posting_frequency || profile.posting_frequency || 3
    }

    // Save preferences to user profile if they were provided in the request
    if (body.niche || body.primary_goal || body.content_style || body.target_audience || body.voice_tone || body.posting_frequency) {
      console.log('Updating user preferences in profile')
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          niche: userProfile.niche,
          primary_goal: userProfile.primary_goal,
          content_style: userProfile.content_style,
          target_audience: userProfile.target_audience,
          voice_tone: userProfile.voice_tone,
          posting_frequency: userProfile.posting_frequency,
          preferences_set: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Failed to update user preferences:', updateError)
      } else {
        console.log('User preferences saved successfully')
      }
    }

    console.log('User profile:', userProfile)

    // Get user's Instagram posts for analysis
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('instagram_posts')
      .select('*')
      .eq('profile_id', userId)
      .order('timestamp', { ascending: false })
      .limit(20)

    if (postsError) {
      console.error('Posts error:', postsError)
    }

    console.log('Found posts:', posts?.length || 0)

    // Analyze user's performance data
    const performanceData = ContentAnalyzer.analyzeUserPerformance(
      posts || [], 
      profile.follower_count || 0
    )

    console.log('Performance analysis complete:', {
      avgEngagementRate: performanceData.avgEngagementRate,
      topContentTypes: performanceData.topPerformingContentTypes.length
    })

    // Get user's discovered patterns from intelligence system
    const { data: userInsights } = await supabaseAdmin
      .from('user_content_insights')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Get top patterns that work for this user's niche
    const { data: topPatterns } = await supabaseAdmin
      .from('content_patterns')
      .select('*')
      .contains('applicable_niches', [userProfile.niche])
      .gte('confidence_score', 70)
      .order('avg_performance_score', { ascending: false })
      .limit(5)

    // Combine insights into user patterns object
    const userPatterns = {
      caption_length: userInsights?.best_caption_length,
      hashtag_count: userInsights?.best_hashtag_count,
      best_posting_hour: userInsights?.best_posting_hour,
      best_content_format: userInsights?.best_content_format,
      patterns: topPatterns || []
    }

    // Generate weekly content plan with intelligence
    const contentPlan = await ContentGenerator.generateWeeklyPlan(
      userProfile,
      performanceData,
      userId,
      userPatterns
    )

    console.log('Content plan generated with', contentPlan.suggestions.length, 'suggestions')

    // Store the content plan in the database
    const { error: insertError } = await supabaseAdmin
      .from('content_plans')
      .insert({
        user_id: userId,
        week_starting: contentPlan.week_starting,
        suggestions: contentPlan.suggestions,
        overall_strategy: contentPlan.overall_strategy,
        user_preferences: userProfile,
        performance_data: performanceData,
        generated_at: contentPlan.generated_at
      })

    if (insertError) {
      console.error('Failed to store content plan:', insertError)
      // Continue anyway - we can still return the plan
    }

    return NextResponse.json({
      success: true,
      content_plan: contentPlan,
      performance_summary: {
        avg_engagement_rate: performanceData.avgEngagementRate,
        total_posts_analyzed: posts?.length || 0,
        top_content_type: performanceData.topPerformingContentTypes[0]?.type || 'REELS'
      }
    })

  } catch (error) {
    console.error('Content plan generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate content plan' },
      { status: 500 }
    )
  }
}