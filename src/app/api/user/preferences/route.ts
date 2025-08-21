import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withAuthAndValidation, withSecurityHeaders } from '@/lib/validation/middleware'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Validation schema for preferences
const PreferencesUpdateSchema = z.object({
  niche: z.enum(['lifestyle', 'fashion', 'beauty', 'fitness', 'food', 'travel', 'tech', 'business']).optional(),
  primary_goal: z.enum(['growth', 'engagement', 'monetization', 'brand_building']).optional(),
  content_style: z.enum(['educational', 'entertaining', 'inspirational', 'authentic', 'promotional']).optional(),
  target_audience: z.string().min(3).max(200).optional(),
  voice_tone: z.enum(['professional', 'casual', 'funny', 'serious', 'inspirational']).optional(),
  posting_frequency: z.number().min(1).max(30).optional()
})

// GET user preferences
export const GET = withSecurityHeaders(
  withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
    try {
      // Get user preferences
      const supabaseAdmin = getSupabaseAdmin()
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('niche, primary_goal, content_style, target_audience, voice_tone, posting_frequency, preferences_set')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Preferences fetch error:', error)
        throw error
      }

      return NextResponse.json({ preferences: profile })

    } catch (error) {
      console.error('Preferences GET error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      )
    }
  })
)

// PUT update preferences
export const PUT = withSecurityHeaders(
  withAuthAndValidation({
    body: PreferencesUpdateSchema
  })(async (request: NextRequest, userId: string, { validatedBody }) => {
    try {
      if (!validatedBody || Object.keys(validatedBody).length === 0) {
        return NextResponse.json({ error: 'No valid preferences provided' }, { status: 400 })
      }

      // Update user preferences with validated data
      const supabaseAdmin = getSupabaseAdmin()
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .update({
          ...validatedBody,
          preferences_set: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Preferences update error:', error)
        throw error
      }

      // Also trigger generation of new content plan if preferences changed
      if (profile) {
        // Clear existing content plans so new ones will be generated
        await supabaseAdmin
          .from('content_plans')
          .delete()
          .eq('user_id', userId)
      }

      return NextResponse.json({ preferences: profile })

    } catch (error) {
      console.error('Preferences PUT error:', error)
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      )
    }
  })
)