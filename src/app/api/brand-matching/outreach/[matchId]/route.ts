import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

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

    // Get match details
    const { data: match, error: matchError } = await supabaseAdmin
      .from('brand_matches')
      .select(`
        *,
        brand:brands(*)
      `)
      .eq('id', params.matchId)
      .eq('profile_id', userId)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Get creator profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    const { data: creatorProfile } = await supabaseAdmin
      .from('creator_profiles')
      .select('profile_data')
      .eq('user_id', userId)
      .single()

    // Generate personalized outreach content using OpenAI
    const emailPrompt = `
      Generate a personalized outreach email following proven brand outreach best practices.
      
      Creator Info:
      - Name: ${profile.full_name}
      - Instagram: @${profile.instagram_username}
      - Followers: ${profile.follower_count}
      - Engagement Rate: ${profile.engagement_rate}%
      - Content Focus: ${creatorProfile?.profile_data?.identity?.contentPillars?.join(', ')}
      - Style: ${creatorProfile?.profile_data?.identity?.contentStyle?.aestheticKeywords?.join(', ')}
      - Top Audience Locations: ${creatorProfile?.profile_data?.analytics?.audienceDemographics?.topLocations?.slice(0, 2).map((l: any) => l.country).join(', ')}
      
      Brand Info:
      - Name: ${match.brand.name}
      - Industry: ${match.brand.industry}
      - Values: ${match.brand.brand_values?.join(', ')}
      - Instagram: ${match.brand.instagram_handle || 'Not provided'}
      - Description: ${match.brand.description}
      
      Match Insights:
      - Overall Score: ${match.match_score}%
      - Top Match Reasons: ${match.insights?.strengths?.slice(0, 2).join(', ')}
      - Audience Overlap: ${match.audience_resonance_score ? Math.round(match.audience_resonance_score * 100) + '%' : 'High'}
      
      CRITICAL Requirements:
      1. Subject line: Reference their RECENT campaign, product launch, or specific initiative
      2. Opening: Show you've researched them - mention something specific from their Instagram or website
      3. Keep it SHORT - max 150 words for the body
      4. Include ONE specific content idea that aligns with their brand aesthetic
      5. Natural, conversational tone - like you're talking to a friend
      6. End with a clear but soft CTA (e.g., "Would love to chat about this!")
      7. Do NOT mention generic things like "I love your brand" without specifics
      
      Use one of these proven approaches:
      - Product Enthusiast: You genuinely use and love a specific product
      - Storytelling: You have a unique story idea that fits their brand narrative
      - Audience Insights: Your audience specifically needs/wants their products
      
      Format the response as JSON with:
      {
        "subject": "subject line with specific reference",
        "body": "email body (keep SHORT!)",
        "personalizationPoints": ["specific brand detail referenced", "content idea mentioned", "audience insight shared"]
      }
    `

    const dmPrompt = `
      Generate a personalized Instagram DM following proven outreach best practices.
      
      Creator: @${profile.instagram_username} (${profile.follower_count} followers, ${profile.engagement_rate}% engagement)
      Content: ${creatorProfile?.profile_data?.identity?.contentPillars?.slice(0, 2).join(' & ')}
      
      Brand: ${match.brand.name} (@${match.brand.instagram_handle || match.brand.name.toLowerCase().replace(/\s+/g, '')})
      Match Score: ${match.match_score}%
      
      CRITICAL DM Requirements:
      1. Super casual and natural - like messaging a friend
      2. Start with something SPECIFIC from their recent posts/stories
      3. Keep it VERY brief - under 80 words
      4. Mention ONE quick collaboration idea that feels organic
      5. No formal introductions - they can see who you are
      6. End with a soft question, not a hard sell
      7. Use emojis sparingly (1-2 max) if it fits naturally
      
      Good DM structure:
      - Hook: Reference their recent post/story specifically
      - Connection: Quick mention of why you relate/connect
      - Idea: One sentence collaboration thought
      - Soft CTA: "Would love to chat if you're interested!"
      
      Format the response as JSON with:
      {
        "message": "dm text (KEEP IT SHORT AND NATURAL!)",
        "personalizationPoints": ["specific post/story referenced", "collaboration idea type"]
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
    
    emailDraft.body = emailDraft.body.replace(
      'call to action',
      `call to action\n\nYou can view my full creator profile and media kit here: ${profileUrl}`
    )
    
    dmDraft.message = dmDraft.message + `\n\nCheck out my creator profile: ${profileUrl}`

    return NextResponse.json({
      success: true,
      match: {
        id: match.id,
        brand: match.brand,
        overallScore: match.match_score,
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