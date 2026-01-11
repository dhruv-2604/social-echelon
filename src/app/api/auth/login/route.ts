import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withValidation, withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'
import { LoginSchema } from '@/lib/validation/schemas'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export const POST = withSecurityHeaders(
  rateLimit(5, 60000)( // 5 login attempts per minute per IP
    withValidation({
      body: LoginSchema
    })(async (request: NextRequest, { validatedBody }) => {
      try {
        if (!validatedBody) {
          return NextResponse.json({ error: 'Request body is required' }, { status: 400 })
        }

        const { email, password } = validatedBody

        const supabaseAdmin = getSupabaseAdmin()

        // Find user by email (email is already sanitized by validation)
        const { data: user, error: fetchError } = await supabaseAdmin
          .from('profiles')
          .select('id, email, password_hash, full_name, instagram_username, subscription_status, user_type')
          .eq('email', email)
          .single() as { data: any, error: any }

        if (fetchError || !user) {
          return NextResponse.json(
            { error: 'Invalid email or password' },
            { status: 401 }
          )
        }

        // Check if user has a password (might be Instagram-only login)
        if (!user.password_hash) {
          return NextResponse.json(
            { error: 'Please sign in with Instagram' },
            { status: 401 }
          )
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash as string)
        
        if (!passwordMatch) {
          return NextResponse.json(
            { error: 'Invalid email or password' },
            { status: 401 }
          )
        }

        // Set session cookies
        const cookieStore = await cookies()
        const userType = user.user_type || 'creator'

        cookieStore.set('user_id', user.id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 days
        })

        cookieStore.set('user_type', userType, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 days
        })

        // Determine redirect based on user type
        let redirectTo = '/dashboard'

        if (userType === 'brand') {
          // Check if brand has completed onboarding
          const { data: brandProfile } = await supabaseAdmin
            .from('brand_profiles')
            .select('onboarding_completed')
            .eq('user_id', user.id)
            .single()

          redirectTo = brandProfile?.onboarding_completed
            ? '/brand/dashboard'
            : '/onboarding/brand'
        } else {
          // For creators, check if Instagram is connected
          const { data: tokenData } = await supabaseAdmin
            .from('user_tokens')
            .select('instagram_access_token')
            .eq('user_id', user.id)
            .single()

          if (!tokenData?.instagram_access_token) {
            redirectTo = '/auth/connect'
          }
        }

        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            instagramUsername: user.instagram_username,
            subscriptionStatus: user.subscription_status,
            userType
          },
          redirectTo
        })

      } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
          { error: 'Failed to sign in' },
          { status: 500 }
        )
      }
    })
  )
)