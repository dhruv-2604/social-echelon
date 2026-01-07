import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withValidation, withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'
import { BrandSignupSchema } from '@/lib/validation/schemas'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export const POST = withSecurityHeaders(
  rateLimit(3, 60000)( // 3 signup attempts per minute per IP
    withValidation({
      body: BrandSignupSchema
    })(async (request: NextRequest, { validatedBody }) => {
      try {
        if (!validatedBody) {
          return NextResponse.json({ error: 'Request body is required' }, { status: 400 })
        }

        const {
          email,
          password,
          companyName,
          contactName,
          website,
          industry
        } = validatedBody

        const supabaseAdmin = getSupabaseAdmin()

        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .single()

        if (existingUser) {
          return NextResponse.json(
            { error: 'An account with this email already exists' },
            { status: 409 }
          )
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Create new user profile with user_type = 'brand'
        const userId = crypto.randomUUID()
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            email: email.toLowerCase(),
            password_hash: hashedPassword,
            full_name: contactName,
            user_type: 'brand',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (profileError) {
          console.error('Error creating brand profile:', profileError)
          return NextResponse.json(
            { error: 'Failed to create account' },
            { status: 500 }
          )
        }

        // Create brand profile entry
        const { error: brandProfileError } = await supabaseAdmin
          .from('brand_profiles')
          .insert({
            user_id: userId,
            company_name: companyName,
            website: website || null,
            industry: industry || null,
            onboarding_completed: false,
            created_at: new Date().toISOString()
          })

        if (brandProfileError) {
          console.error('Error creating brand_profiles entry:', brandProfileError)
          // Rollback - delete the profile we just created
          await supabaseAdmin.from('profiles').delete().eq('id', userId)
          return NextResponse.json(
            { error: 'Failed to create brand profile' },
            { status: 500 }
          )
        }

        // Set session cookie
        const cookieStore = await cookies()
        cookieStore.set('user_id', userId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 days
        })

        // Set user type cookie for middleware routing
        cookieStore.set('user_type', 'brand', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 days
        })

        return NextResponse.json({
          success: true,
          userId,
          userType: 'brand',
          message: 'Brand account created successfully'
        })

      } catch (error) {
        console.error('Brand signup error:', error)
        return NextResponse.json(
          { error: 'Failed to create account' },
          { status: 500 }
        )
      }
    })
  )
)
