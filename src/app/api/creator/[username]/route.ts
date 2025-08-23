import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Validation schema for username parameter
const UsernameParamsSchema = z.object({
  username: z.string()
    .min(1, 'Username required')
    .max(30, 'Username too long')
    .regex(/^[a-zA-Z0-9_.]+$/, 'Invalid username format')
})

// GET - Get creator's public media kit profile (PUBLIC endpoint)
export const GET = withSecurityHeaders(
  rateLimit(60, 60000)( // 60 requests per minute for public endpoint
    async (request: NextRequest, context?: { params?: Promise<any> | any }) => {
      try {
        // Resolve params
        const resolvedParams = context?.params instanceof Promise 
          ? await context.params 
          : context?.params

        // Validate username
        const validationResult = UsernameParamsSchema.safeParse(resolvedParams)
        if (!validationResult.success) {
          return NextResponse.json({ 
            error: 'Invalid username format' 
          }, { status: 400 })
        }

        const { username } = validationResult.data

        const supabaseAdmin = getSupabaseAdmin()
        
        // Get creator's public profile data
        const { data: profile, error } = await supabaseAdmin
          .from('profiles')
          .select(`
            instagram_username,
            full_name,
            avatar_url,
            follower_count,
            engagement_rate,
            posts_count,
            bio,
            niche,
            content_style,
            id
          `)
          .eq('instagram_username', username)
          .single()

        if (error || !profile) {
          return NextResponse.json({ 
            error: 'Creator profile not found' 
          }, { status: 404 })
        }

        // Get sanitized brand matching profile data (public fields only)
        const { data: creatorProfile } = await supabaseAdmin
          .from('creator_profiles')
          .select('profile_data')
          .eq('user_id', (profile as any).id)
          .single()

        // Extract only public-facing data from brand profile
        const publicProfileData = creatorProfile?.profile_data ? {
          contentPillars: (creatorProfile.profile_data as any).identity?.contentPillars?.slice(0, 5) || [],
          brandValues: (creatorProfile.profile_data as any).identity?.brandValues?.slice(0, 8) || [],
          skills: (creatorProfile.profile_data as any).professional?.skills?.slice(0, 10) || [],
          languages: (creatorProfile.profile_data as any).professional?.languages || [],
          audienceLocations: (creatorProfile.profile_data as any).analytics?.topLocations?.slice(0, 3) || [],
          ageRanges: (creatorProfile.profile_data as any).analytics?.ageRanges?.slice(0, 3) || []
        } : null

        // Get recent posts for portfolio (public posts only)
        const { data: recentPosts } = await supabaseAdmin
          .from('instagram_posts')
          .select(`
            id,
            caption,
            media_url,
            permalink,
            timestamp,
            like_count,
            comment_count,
            media_type
          `)
          .eq('profile_id', (profile as any).id)
          .order('timestamp', { ascending: false })
          .limit(9)

        // Sanitize recent posts data
        const sanitizedPosts = recentPosts?.map(post => ({
          id: post.id,
          caption: (post.caption as string)?.substring(0, 150) + ((post.caption as string)?.length > 150 ? '...' : ''),
          media_url: post.media_url,
          permalink: post.permalink,
          timestamp: post.timestamp,
          like_count: Math.max(0, (post.like_count as number) || 0),
          comment_count: Math.max(0, (post.comment_count as number) || 0),
          media_type: post.media_type
        })) || []

        // Build public creator media kit
        const publicCreatorData = {
          instagram_username: (profile as any).instagram_username,
          full_name: (profile as any).full_name,
          avatar_url: (profile as any).avatar_url,
          follower_count: Math.max(0, (profile as any).follower_count || 0),
          engagement_rate: Math.max(0, Math.min(100, (profile as any).engagement_rate || 0)),
          posts_count: Math.max(0, (profile as any).posts_count || 0),
          bio: (profile as any).bio?.substring(0, 200), // Limit bio length
          niche: (profile as any).niche,
          content_style: (profile as any).content_style,
          brand_profile: publicProfileData,
          recent_posts: sanitizedPosts,
          // Add media kit specific fields
          media_kit: {
            last_updated: new Date().toISOString(),
            profile_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.socialechelon.com'}/creator/${username}`,
            contact_info: 'Available through Social Echelon platform'
          }
        }

        // Set cache headers for public content
        const response = NextResponse.json({ 
          creator: publicCreatorData,
          success: true 
        })

        // Cache for 15 minutes
        response.headers.set('Cache-Control', 'public, max-age=900, stale-while-revalidate=1800')

        return response

      } catch (error) {
        console.error('Error fetching creator profile:', error)
        return NextResponse.json(
          { error: 'Failed to fetch creator profile' },
          { status: 500 }
        )
      }
    }
  )
)