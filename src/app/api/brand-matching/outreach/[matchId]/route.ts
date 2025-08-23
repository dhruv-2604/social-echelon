import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import OpenAI from 'openai'
import { EnhancedBrandMatchingService } from '@/lib/brand-matching/enhanced-matching-service'
import { withAuthAndValidation, withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Validation schema for match ID parameter
const MatchIdParamsSchema = z.object({
  matchId: z.string().uuid('Invalid match ID format')
})

// GET - Generate outreach content for a brand match (authenticated users only)
export const GET = withSecurityHeaders(
  rateLimit(5, 300000)( // 5 requests per 5 minutes (expensive AI operation)
    withAuthAndValidation({
      params: MatchIdParamsSchema
    })(async (request: NextRequest, userId: string, { validatedParams, params }) => {
      try {
        const matchingService = new EnhancedBrandMatchingService()
        const supabaseAdmin = getSupabaseAdmin()

        // Resolve params if needed
        const resolvedParams = params instanceof Promise ? await params : params
        const matchId = validatedParams?.matchId || resolvedParams?.matchId

        if (!matchId) {
          return NextResponse.json({ error: 'Match ID required' }, { status: 400 })
        }

        // Get match details from user_brand_matches (ensure user owns this match)
        const { data: match, error: matchError } = await supabaseAdmin
          .from('user_brand_matches')
          .select(`
            id,
            match_score,
            match_category,
            insights,
            brand_id,
            brand:brands(
              id,
              display_name,
              brand_name,
              industry,
              instagram_handle,
              recent_campaigns,
              influencer_strategy
            )
          `)
          .eq('id', matchId)
          .eq('user_id', userId)
          .single()

        if (matchError || !match) {
          return NextResponse.json({ error: 'Match not found or access denied' }, { status: 404 })
        }

        // Get creator profile (only necessary fields for outreach)
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select(`
            full_name,
            instagram_username,
            follower_count,
            engagement_rate
          `)
          .eq('id', userId)
          .single()

        const { data: creatorProfile } = await supabaseAdmin
          .from('creator_profiles')
          .select('profile_data')
          .eq('user_id', userId)
          .single()

        if (!profile) {
          return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 })
        }

        // Validate that OpenAI API key is configured
        if (!process.env.OPENAI_API_KEY) {
          return NextResponse.json({ error: 'AI content generation not available' }, { status: 503 })
        }

        // Sanitize inputs for AI generation
        const sanitizeInput = (input: string | null | undefined): string => {
          return input?.replace(/[<>'"&]/g, '').trim().slice(0, 100) || 'Not specified'
        }

        // Generate personalized outreach content using OpenAI
        const emailPrompt = `
          Generate a personalized brand outreach email using one of these three proven templates.
          
          Creator Info:
          - Name: ${sanitizeInput(profile.full_name as string || 'Creator')}
          - Instagram: @${sanitizeInput(profile.instagram_username as string || 'unknown')}
          - Followers: ${Math.max(0, profile.follower_count as number || 0)}
          - Engagement Rate: ${Math.max(0, Math.min(100, profile.engagement_rate as number || 0))}%
          - Content Focus: ${sanitizeInput((creatorProfile?.profile_data as any)?.identity?.contentPillars?.slice(0, 3)?.join(', ') || 'Not specified')}
          - Audience: ${sanitizeInput((creatorProfile?.profile_data as any)?.analytics?.audienceDemographics?.topLocations?.[0]?.country as string || 'Global')} based
          
          Brand Info:
          - Name: ${sanitizeInput((match.brand as any)?.display_name as string || 'Brand')}
          - Industry: ${sanitizeInput((match.brand as any)?.industry as string || 'Not specified')}
          - Instagram: @${sanitizeInput((match.brand as any)?.instagram_handle as string || 'unknown')}
          - Recent Campaigns: ${sanitizeInput((match.brand as any)?.recent_campaigns as string || 'Not specified')}
          - Influencer Strategy: ${sanitizeInput((match.brand as any)?.influencer_strategy as string || 'Standard partnerships')}
      
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
          
          Creator: @${sanitizeInput(profile.instagram_username as string)} (${sanitizeInput((creatorProfile?.profile_data as any)?.identity?.contentPillars?.[0] as string || 'lifestyle')} creator)
          Brand: ${sanitizeInput((match.brand as any)?.display_name as string)} (@${sanitizeInput((match.brand as any)?.instagram_handle as string || 'unknown')})
          
          CRITICAL RULES:
          1. Maximum 2-3 sentences (under 50 words total)
          2. Reference their recent content
          3. Sound professional but friendly
          4. One specific content idea
          5. End with: "Check out my creator profile: [link]"
          
          Format the response as JSON with:
          {
            "message": "the DM text (under 50 words)",
            "personalizationPoints": ["content referenced"]
          }
        `

        // Initialize OpenAI client with timeout
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY!,
          timeout: 30000 // 30 second timeout
        })

        try {
          const [emailResponse, dmResponse] = await Promise.all([
            openai.chat.completions.create({
              model: 'gpt-3.5-turbo', // Use cheaper model for this use case
              messages: [{ role: 'user', content: emailPrompt }],
              temperature: 0.7,
              max_tokens: 500, // Limit response length
              response_format: { type: 'json_object' }
            }),
            openai.chat.completions.create({
              model: 'gpt-3.5-turbo',
              messages: [{ role: 'user', content: dmPrompt }],
              temperature: 0.7,
              max_tokens: 200, // Shorter for DMs
              response_format: { type: 'json_object' }
            })
          ])

          const emailDraft = JSON.parse(emailResponse.choices[0]?.message?.content || '{"error": "No content"}')
          const dmDraft = JSON.parse(dmResponse.choices[0]?.message?.content || '{"error": "No content"}')

          // Validate AI responses
          if (!emailDraft.body || !dmDraft.message) {
            throw new Error('AI generated invalid content')
          }

          // Add profile link securely
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.socialechelon.com'
          const profileUrl = `${baseUrl}/creator/${encodeURIComponent(profile.instagram_username as string)}`
          
          // Replace placeholder safely
          if (emailDraft.body && typeof emailDraft.body === 'string') {
            emailDraft.body = emailDraft.body.replace(
              'Social Echelon profile',
              `Social Echelon profile: ${profileUrl}`
            )
          }
          
          if (dmDraft.message && typeof dmDraft.message === 'string') {
            dmDraft.message = dmDraft.message.replace('[link]', profileUrl)
          }

          // Track outreach generation
          try {
            await matchingService.trackOutreachSent(userId, match.brand_id || (match.brand as any)?.id || '')
          } catch (trackingError) {
            console.error('Error tracking outreach:', trackingError)
            // Don't fail the request if tracking fails
          }

          return NextResponse.json({
            success: true,
            match: {
              id: match.id,
              brand: {
                display_name: (match.brand as any)?.display_name,
                instagram_handle: (match.brand as any)?.instagram_handle,
                industry: (match.brand as any)?.industry
              },
              match_score: match.match_score,
              match_category: match.match_category
              // Don't expose sensitive insights
            },
            creator: {
              instagram_username: profile.instagram_username,
              full_name: profile.full_name
            },
            emailDraft: {
              subject: emailDraft.subject,
              body: emailDraft.body,
              template_used: emailDraft.template_used
            },
            dmDraft: {
              message: dmDraft.message
            }
          })

        } catch (aiError) {
          console.error('OpenAI API error:', aiError)
          return NextResponse.json(
            { error: 'AI content generation temporarily unavailable' },
            { status: 503 }
          )
        }

      } catch (error) {
        console.error('Error generating outreach:', error)
        return NextResponse.json(
          { error: 'Failed to generate outreach content' },
          { status: 500 }
        )
      }
    })
  )
)