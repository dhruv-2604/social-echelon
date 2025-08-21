import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withValidation, withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'
import { SignupSchema } from '@/lib/validation/schemas'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export const POST = withSecurityHeaders(
  rateLimit(3, 60000)( // 3 signup attempts per minute per IP
    withValidation({
      body: SignupSchema
    })(async (request: NextRequest, { validatedBody }) => {
      try {
        if (!validatedBody) {
          return NextResponse.json({ error: 'Request body is required' }, { status: 400 })
        }

        const { 
          email, 
          password, 
          fullName, 
          instagramHandle, 
          phone,
          plan,
          billingCycle
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

    // Check if Instagram handle is taken
    const cleanHandle = instagramHandle.replace('@', '').toLowerCase()
    const { data: existingHandle } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('instagram_username', cleanHandle)
      .single()

    if (existingHandle) {
      return NextResponse.json(
        { error: 'This Instagram handle is already registered' },
        { status: 409 }
      )
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user
    const userId = crypto.randomUUID()
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email: email.toLowerCase(),
        password_hash: hashedPassword,
        full_name: fullName,
        instagram_username: cleanHandle,
        phone: phone,
        subscription_plan: plan || 'balance',
        billing_cycle: billingCycle || 'monthly',
        subscription_status: 'pending_payment', // Will become active after payment
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating user:', insertError)
      return NextResponse.json(
        { error: 'Failed to create account' },
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

    // Store signup session for payment flow
    cookieStore.set('pending_payment', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 // 1 hour to complete payment
    })

    return NextResponse.json({
      success: true,
      userId,
      message: 'Account created successfully'
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
    })
  )
)