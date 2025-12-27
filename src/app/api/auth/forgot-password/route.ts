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

          // Send password reset email via Resend
          if (process.env.RESEND_API_KEY) {
            const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`

            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: `Social Echelon <${process.env.OUTREACH_FROM_EMAIL || 'noreply@socialechelon.co'}>`,
                to: user.email,
                subject: 'Reset your Social Echelon password',
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #333;">Reset Your Password</h2>
                    <p>Hi${user.full_name ? ` ${user.full_name}` : ''},</p>
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>
                    <a href="${resetUrl}" style="display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>
                    <p style="color: #666; font-size: 14px;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                    <p style="color: #999; font-size: 12px;">Social Echelon - Wellness-first creator growth</p>
                  </div>
                `
              })
            })
          }
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