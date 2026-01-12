import { NextRequest, NextResponse } from 'next/server'
import { DeadLetterQueue } from '@/lib/queue/dead-letter-queue'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'

/**
 * Admin-only API for managing the dead letter queue
 *
 * GET /api/admin/dead-letter-queue - List dead letters with optional filters
 * POST /api/admin/dead-letter-queue - Retry or resolve a dead letter
 */

async function verifyAdmin(): Promise<string | null> {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value

  if (!userId) {
    return null
  }

  const supabase = getSupabaseAdmin()
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', userId)
    .single()

  if ((profile as { user_type: string } | null)?.user_type !== 'admin') {
    return null
  }

  return userId
}

export async function GET(request: NextRequest) {
  const adminId = await verifyAdmin()
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as 'dead' | 'retrying' | 'resolved' | null
    const jobType = searchParams.get('jobType') || undefined
    const userId = searchParams.get('userId') || undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const includeStats = searchParams.get('includeStats') === 'true'

    const deadLetters = await DeadLetterQueue.list({
      status: status || undefined,
      jobType,
      userId,
      limit,
      offset
    })

    let stats = null
    if (includeStats) {
      stats = await DeadLetterQueue.getStats()
    }

    return NextResponse.json({
      deadLetters,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: deadLetters.length === limit
      }
    })
  } catch (error) {
    console.error('Error fetching dead letters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dead letters' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const adminId = await verifyAdmin()
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action, dlqId, notes, jobType } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required (retry, resolve, bulkRetry, purge)' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'retry': {
        if (!dlqId) {
          return NextResponse.json(
            { error: 'dlqId is required for retry' },
            { status: 400 }
          )
        }
        const newJobId = await DeadLetterQueue.retry(dlqId)
        return NextResponse.json({
          success: true,
          message: 'Dead letter queued for retry',
          newJobId
        })
      }

      case 'resolve': {
        if (!dlqId || !notes) {
          return NextResponse.json(
            { error: 'dlqId and notes are required for resolve' },
            { status: 400 }
          )
        }
        await DeadLetterQueue.resolve(dlqId, notes, adminId)
        return NextResponse.json({
          success: true,
          message: 'Dead letter resolved'
        })
      }

      case 'bulkRetry': {
        if (!jobType) {
          return NextResponse.json(
            { error: 'jobType is required for bulkRetry' },
            { status: 400 }
          )
        }
        const retriedCount = await DeadLetterQueue.bulkRetry(jobType)
        return NextResponse.json({
          success: true,
          message: `${retriedCount} dead letters queued for retry`,
          retriedCount
        })
      }

      case 'purge': {
        const olderThanDays = body.olderThanDays || 30
        const purgedCount = await DeadLetterQueue.purgeResolved(olderThanDays)
        return NextResponse.json({
          success: true,
          message: `${purgedCount} resolved dead letters purged`,
          purgedCount
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error managing dead letter:', error)
    return NextResponse.json(
      { error: 'Failed to manage dead letter' },
      { status: 500 }
    )
  }
}
