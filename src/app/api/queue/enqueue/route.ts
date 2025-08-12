import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { JobQueue } from '@/lib/queue/job-queue'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { type, payload, priority = 5 } = body

    if (!type) {
      return NextResponse.json({ error: 'Job type is required' }, { status: 400 })
    }

    const queue = JobQueue.getInstance()
    
    // Enqueue the job
    const jobId = await queue.enqueue(
      type,
      payload,
      {
        userId,
        priority
      }
    )

    return NextResponse.json({
      success: true,
      jobId,
      message: `Job ${type} queued successfully`
    })

  } catch (error) {
    console.error('Enqueue error:', error)
    return NextResponse.json(
      { error: 'Failed to enqueue job' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const queue = JobQueue.getInstance()
    
    // Get user's jobs
    const jobs = await queue.getUserJobs(userId, 20)
    
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
}