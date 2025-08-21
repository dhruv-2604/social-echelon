import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withAuthAndValidation, withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'
import { z } from 'zod'
import { OutreachAutomationService } from '@/lib/brand-discovery/outreach-automation'

export const dynamic = 'force-dynamic'

// Optional body schema for specific automation tasks
const AutomationOptionsSchema = z.object({
  runCampaigns: z.boolean().default(true),
  scheduleDailyOutreach: z.boolean().default(true),
  processScheduled: z.boolean().default(true),
  processResponses: z.boolean().default(true),
  maxOutreachPerRun: z.number().min(1).max(50).default(10) // Limit emails per run
}).optional()

export const POST = withSecurityHeaders(
  rateLimit(1, 3600000)( // Only 1 automation run per hour to prevent abuse
    withAuthAndValidation({
      body: AutomationOptionsSchema
    })(async (request: NextRequest, userId: string, { validatedBody }) => {
      try {
        // Check if user is admin
        const supabaseAdmin = getSupabaseAdmin()
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()

        if (profile?.role !== 'admin') {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const options = validatedBody || {
          runCampaigns: true,
          scheduleDailyOutreach: true,
          processScheduled: true,
          processResponses: true,
          maxOutreachPerRun: 10
        }

        const automationService = new OutreachAutomationService()
        const results = {
          campaigns: false,
          scheduled: false,
          processed: false,
          responses: false
        }

        // Run only requested operations with limits
        if (options.runCampaigns) {
          await automationService.createPersonalizedCampaigns()
          results.campaigns = true
        }

        if (options.scheduleDailyOutreach) {
          await automationService.scheduleDailyOutreach()
          results.scheduled = true
        }

        if (options.processScheduled) {
          await automationService.processScheduledOutreach()
          results.processed = true
        }

        if (options.processResponses) {
          await automationService.processResponses()
          results.responses = true
        }

        return NextResponse.json({
          success: true,
          message: 'Automation cycle completed successfully',
          results,
          maxOutreachPerRun: options.maxOutreachPerRun
        })

      } catch (error) {
        console.error('Error running automation:', error)
        return NextResponse.json(
          { error: 'Failed to run automation' },
          { status: 500 }
        )
      }
    })
  )
)