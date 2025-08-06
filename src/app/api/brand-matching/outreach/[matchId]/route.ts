import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import OpenAI from 'openai'
import { EnhancedBrandMatchingService } from '@/lib/brand-matching/enhanced-matching-service'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

const matchingService = new EnhancedBrandMatchingService()

export async function GET(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get match details from user_brand_matches
    const { data: match, error: matchError } = await supabaseAdmin
      .from('user_brand_matches')
      .select(`
        *,
        brand:brands(*)
      `)
      .eq('id', params.matchId)
      .eq('user_id', userId)
      .single() as { data: any; error: any }

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Get creator profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single() as { data: any; error: any }

    const { data: creatorProfile } = await supabaseAdmin
      .from('creator_profiles')
      .select('profile_data')
      .eq('user_id', userId)
      .single() as { data: any; error: any }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Generate personalized outreach content using OpenAI
    const emailPrompt = `
      Generate a personalized brand outreach email using one of these three proven templates.
      
      Creator Info:
      - Name: ${profile.full_name || 'Creator'}
      - Instagram: @${profile.instagram_username || 'unknown'}
      - Followers: ${profile.follower_count || 0}
      - Engagement Rate: ${profile.engagement_rate || 0}%
      - Content Focus: ${creatorProfile?.profile_data?.identity?.contentPillars?.join(', ') || 'Not specified'}
      - Audience: ${creatorProfile?.profile_data?.analytics?.audienceDemographics?.topLocations?.[0]?.country || 'Global'} based, ${creatorProfile?.profile_data?.analytics?.audienceDemographics?.ageRanges?.[0]?.range || '18-34'} age range
      
      Brand Info:
      - Name: ${match.brand?.display_name || 'Brand'}
      - Industry: ${match.brand?.industry || 'Not specified'}
      - Instagram: @${match.brand?.instagram_handle || match.brand?.brand_name?.toLowerCase().replace(/\s+/g, '') || 'unknown'}
      - Recent Campaigns: ${match.brand?.recent_campaigns || 'Not specified'}
      - Influencer Strategy: ${match.brand?.influencer_strategy || 'Standard partnerships'}
      
      Choose ONE of these templates and fill in the bracketed parts:
      
      Template 1 - Direct Approach:
      "Hey [Brand Name] team!
      
      I'm [Your Name], a [brief description of what you do], and I absolutely love your [specific product].
      
      It's been a game-changer for me, and I'd love to share my passion for it with my followers.
      
      Do you have some time to chat about how we can showcase your amazing products together?
      
      PS – Feel free to check out my Social Echelon profile to get a better feel for engagement metrics and content style."
      
      Template 2 - Storytelling Approach:
      "Hi [Brand Name] team,
      
      I'm [Your Name], a [brief description of what you do].
      
      Your [specific product] has truly transformed my daily routine, and I'd love to share this journey with my audience.
      
      I believe that together, we can create a compelling narrative around how your product helps people achieve [specific goal].
      
      Let's discuss how we can bring this story to life!
      
      PS – Feel free to check out my Social Echelon profile to get a better feel for engagement metrics and content style."
      
      Template 3 - Audience Insights:
      "Hi [Recipient's Name or Brand Team],
      
      I'm [Your Name], a [brief description of what you do], and I've been closely following [Brand Name]'s innovations.
      
      My audience consists primarily of [demographic], who are always looking for [specific benefit your product offers]. I'm confident that we can create content that not only engages my audience but also drives value for your brand.
      
      Could we schedule a call to explore this potential partnership?
      
      PS – Feel free to check out my Social Echelon profile to get a better feel for engagement metrics and content style."
      
      CRITICAL REQUIREMENTS:
      - Research the brand and mention SPECIFIC products, campaigns, or recent posts - NO generic compliments
      - Keep total email under 150 words (templates are already short)
      - For [specific product], mention an ACTUAL product name from their catalog
      - For [specific goal/benefit], be precise about what their customers achieve
      - Choose the template that best matches the brand-creator fit
      - Subject line should reference a recent campaign or product launch if possible
      - USE THE RECENT CAMPAIGNS INFO: If provided, reference their actual campaigns or collaborations
      - ALIGN WITH THEIR STRATEGY: If they prefer long-term partnerships, mention that. If they work with specific types of creators, explain why you fit
      
      EXAMPLE of specificity:
      BAD: "I love your products"
      GOOD: "I absolutely love your Cloud Paint in Storm"
      
      BAD: "helps people feel confident"  
      GOOD: "helps busy moms achieve that 5-minute no-makeup look"
      
      Format the response as JSON with:
      {
        "subject": "subject line",
        "body": "completed email template with all brackets filled",
        "template_used": "direct/storytelling/audience_insights",
        "personalizationPoints": ["specific product mentioned", "specific benefit/goal mentioned"]
      }
    `

    const dmPrompt = `
      Generate a SHORT, NATURAL Instagram DM for brand outreach.
      
      Creator: @${profile.instagram_username} (${creatorProfile?.profile_data?.identity?.contentPillars?.[0] || 'lifestyle'} creator)
      Brand: ${match.brand.display_name} (@${match.brand.instagram_handle || match.brand.brand_name.toLowerCase().replace(/\s+/g, '')})
      
      CRITICAL RULES:
      1. Maximum 2-3 sentences (under 50 words total)
      2. Reference their MOST RECENT post or story specifically
      3. Sound like you're DMing a friend - super casual
      4. One specific content idea that fits their current vibe
      5. End with: "Check out my creator profile: [link]"
      
      EXAMPLES of natural DMs:
      "Hey! Your new matcha latte launch looks incredible 🍵 Would love to create a 'morning routine' reel featuring it - my wellness audience would be obsessed. Check out my creator profile: [link]"
      
      "Just saw your Coachella collection drop! I'd love to style 3 festival looks for my fashion-forward followers. Check out my creator profile: [link]"
      
      BE SPECIFIC - mention actual products, campaigns, or posts you "just saw"
      
      Format the response as JSON with:
      {
        "message": "the DM text (MUST be under 50 words, natural tone)",
        "personalizationPoints": ["specific thing you referenced"]
      }
    `

    const [emailResponse, dmResponse] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: emailPrompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }),
      openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: dmPrompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    ])

    const emailDraft = JSON.parse(emailResponse.choices[0].message.content || '{}')
    const dmDraft = JSON.parse(dmResponse.choices[0].message.content || '{}')

    // Add profile link to both drafts
    const profileUrl = `${process.env.NEXT_PUBLIC_APP_URL}/creator/${profile.instagram_username}`
    
    // For email, replace the placeholder in the PS section
    emailDraft.body = emailDraft.body.replace(
      'Social Echelon profile',
      `Social Echelon profile: ${profileUrl}`
    )
    
    // For DM, replace the [link] placeholder
    dmDraft.message = dmDraft.message.replace('[link]', profileUrl)

    // Track that outreach was generated (helps with response rate tracking)
    await matchingService.trackOutreachSent(userId, match.brand_id || match.brand?.id || '')

    return NextResponse.json({
      success: true,
      match: {
        id: match.id,
        brand: match.brand,
        overallScore: match.match_score,
        matchCategory: match.match_category,
        insights: match.insights || {}
      },
      creator: {
        instagram_username: profile.instagram_username,
        full_name: profile.full_name
      },
      emailDraft,
      dmDraft
    })

  } catch (error) {
    console.error('Error generating outreach:', error)
    return NextResponse.json(
      { error: 'Failed to generate outreach content' },
      { status: 500 }
    )
  }
}