import { NextRequest, NextResponse } from 'next/server'
import { JobQueue } from '@/lib/queue/job-queue'
import { withAuthAndValidation, withSecurityHeaders, rateLimit, requireAuth } from '@/lib/validation/middleware'
import { JobEnqueueSchema } from '@/lib/validation/schemas'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Query validation for GET request
const JobsQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(20)
})

export const POST = withSecurityHeaders(
  rateLimit(10, 60000)( // 10 requests per minute
    withAuthAndValidation({
      body: JobEnqueueSchema
    })(async (request: NextRequest, userId: string, { validatedBody }) => {
      try {
        if (!validatedBody) {
          return NextResponse.json({ error: 'Request body is required' }, { status: 400 })
        }

        const queue = JobQueue.getInstance()
        
        // Enqueue the job with validated data
        const jobId = await queue.enqueue(
          validatedBody.type as any,
          validatedBody.payload || {},
          {
            userId,
            priority: validatedBody.priority
          }
        )

        return NextResponse.json({
          success: true,
          jobId,
          message: `Job ${validatedBody.type} queued successfully`
        })

      } catch (error) {
        console.error('Enqueue error:', error)
        return NextResponse.json(
          { error: 'Failed to enqueue job' },
          { status: 500 }
        )
      }
    })
  )
)

export const GET = withSecurityHeaders(
  withAuthAndValidation({
    query: JobsQuerySchema
  })(async (request: NextRequest, userId: string, { validatedQuery }) => {
    try {
      const queue = JobQueue.getInstance()
      const limit = validatedQuery?.limit || 20
      
      // Get user's jobs
      const jobs = await queue.getUserJobs(userId, limit)
      
      // Get queue stats
      const pendingCount = await queue.getPendingJobsCount()
      const processingCount = await queue.getProcessingJobsCount()

      return NextResponse.json({
        jobs,
        stats: {
          pending: pendingCount,
          processing: processingCount,
          userJobs: jobs.length
        }
      })

    } catch (error) {
      console.error('Get jobs error:', error)
      return NextResponse.json(
        { error: 'Failed to get jobs' },
        { status: 500 }
      )
    }
  })
)