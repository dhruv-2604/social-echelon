import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'
import crypto from 'crypto'

export const POST = withSecurityHeaders(
  rateLimit(3, 3600000)( // 3 requests per hour to prevent abuse
    async (request: NextRequest) => {
      try {
        const body = await request.json()
        const { email } = body

        if (!email) {
          return NextResponse.json(
            { error: 'Email is required' },
            { status: 400 }
          )
        }

        const supabaseAdmin = getSupabaseAdmin()

        // Check if user exists
        const { data: user } = await supabaseAdmin
          .from('profiles')
          .select('id, email, full_name')
          .eq('email', email.toLowerCase())
          .single()

        // Always return success to prevent email enumeration
        // But only send email if user exists
        if (user) {
          // Generate reset token
          const resetToken = crypto.randomBytes(32).toString('hex')
          const resetTokenExpiry = new Date(Date.now() + 3600000).toISOString() // 1 hour

          // Store reset token in database
          await supabaseAdmin
            .from('password_reset_tokens')
            .insert({
              user_id: user.id,
              token: resetToken,
              expires_at: resetTokenExpiry,
              created_at: new Date().toISOString()
            })

          // In production, you would send an email here
          // For now, we'll just log it
          console.log(`
            ========================================
            PASSWORD RESET REQUESTED
            ========================================
            Email: ${user.email}
            Reset Link: ${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}
            Expires: ${resetTokenExpiry}
            ========================================
          `)

          // TODO: Integrate with email service (SendGrid, Resend, etc.)
          // await sendPasswordResetEmail(user.email, resetToken)
        }

        // Always return success to prevent email enumeration
        return NextResponse.json({
          success: true,
          message: 'If an account exists with this email, we have sent password reset instructions.'
        })

      } catch (error) {
        console.error('Password reset error:', error)
        return NextResponse.json(
          { error: 'Failed to process password reset request' },
          { status: 500 }
        )
      }
    }
  )
)