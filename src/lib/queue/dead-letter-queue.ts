/**
 * Dead Letter Queue Service
 *
 * Manages permanently failed jobs for investigation and retry
 */

import { getSupabaseAdmin } from '@/lib/supabase-admin'

export interface DeadLetter {
  id: string
  original_job_id: string
  job_type: string
  user_id: string | null
  payload: Record<string, unknown>
  error_history: Array<{ error: string; retry: number; at: string }>
  final_error: string
  retry_count: number
  max_retries: number
  original_created_at: string
  failed_at: string
  status: 'dead' | 'retrying' | 'resolved'
  resolution_notes: string | null
  resolved_at: string | null
  resolved_by: string | null
}

export interface DLQStats {
  total: number
  dead: number
  retrying: number
  resolved: number
  byType: Record<string, number>
}

/**
 * Dead Letter Queue management
 */
export class DeadLetterQueue {
  /**
   * List dead letters with optional filters
   */
  static async list(options: {
    status?: 'dead' | 'retrying' | 'resolved'
    jobType?: string
    userId?: string
    limit?: number
    offset?: number
  } = {}): Promise<DeadLetter[]> {
    const supabase = getSupabaseAdmin()
    const { status, jobType, userId, limit = 50, offset = 0 } = options

    let query = supabase
      .from('dead_letter_queue')
      .select('*')
      .order('failed_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }
    if (jobType) {
      query = query.eq('job_type', jobType)
    }
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching dead letters:', error)
      throw error
    }

    return (data || []) as unknown as DeadLetter[]
  }

  /**
   * Get a single dead letter by ID
   */
  static async get(dlqId: string): Promise<DeadLetter | null> {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('dead_letter_queue')
      .select('*')
      .eq('id', dlqId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return data as unknown as DeadLetter
  }

  /**
   * Retry a dead letter (creates new job)
   */
  static async retry(dlqId: string): Promise<string> {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase.rpc('retry_dead_letter', {
      p_dlq_id: dlqId
    })

    if (error) {
      console.error('Error retrying dead letter:', error)
      throw error
    }

    return data as string
  }

  /**
   * Resolve a dead letter (mark as handled without retry)
   */
  static async resolve(
    dlqId: string,
    notes: string,
    resolverId?: string
  ): Promise<void> {
    const supabase = getSupabaseAdmin()

    const { error } = await supabase.rpc('resolve_dead_letter', {
      p_dlq_id: dlqId,
      p_notes: notes,
      p_resolver_id: resolverId || null
    })

    if (error) {
      console.error('Error resolving dead letter:', error)
      throw error
    }
  }

  /**
   * Get DLQ statistics
   */
  static async getStats(): Promise<DLQStats> {
    const supabase = getSupabaseAdmin()

    // Get counts by status
    const { data: statusCounts } = await supabase
      .from('dead_letter_queue')
      .select('status')

    // Get counts by type
    const { data: typeCounts } = await supabase
      .from('dead_letter_queue')
      .select('job_type')
      .eq('status', 'dead')

    const stats: DLQStats = {
      total: statusCounts?.length || 0,
      dead: 0,
      retrying: 0,
      resolved: 0,
      byType: {}
    }

    // Count by status
    statusCounts?.forEach((row) => {
      const status = (row as any).status
      if (status === 'dead') stats.dead++
      else if (status === 'retrying') stats.retrying++
      else if (status === 'resolved') stats.resolved++
    })

    // Count by type (only dead ones)
    typeCounts?.forEach((row) => {
      const jobType = (row as any).job_type
      stats.byType[jobType] = (stats.byType[jobType] || 0) + 1
    })

    return stats
  }

  /**
   * Bulk retry all dead letters of a specific type
   */
  static async bulkRetry(jobType: string): Promise<number> {
    const deadLetters = await this.list({ status: 'dead', jobType })
    let retried = 0

    for (const dl of deadLetters) {
      try {
        await this.retry(dl.id)
        retried++
      } catch (error) {
        console.error(`Failed to retry dead letter ${dl.id}:`, error)
      }
    }

    return retried
  }

  /**
   * Purge resolved dead letters older than specified days
   */
  static async purgeResolved(olderThanDays: number = 30): Promise<number> {
    const supabase = getSupabaseAdmin()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const { data, error } = await supabase
      .from('dead_letter_queue')
      .delete()
      .eq('status', 'resolved')
      .lt('resolved_at', cutoffDate.toISOString())
      .select('id')

    if (error) {
      console.error('Error purging resolved dead letters:', error)
      throw error
    }

    return data?.length || 0
  }
}
