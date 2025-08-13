import { getSupabaseAdmin } from '@/lib/supabase-admin'

export type JobType = 
  | 'algorithm_detection'
  | 'content_generation'
  | 'trend_collection'
  | 'brand_discovery'
  | 'instagram_sync'
  | 'performance_collection'

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface JobPayload {
  [key: string]: any
}

export interface Job {
  id: string
  type: JobType
  status: JobStatus
  priority: number
  user_id?: string
  payload?: JobPayload
  result?: any
  error?: string
  retry_count: number
  max_retries: number
  created_at: string
  started_at?: string
  completed_at?: string
  scheduled_for: string
}

export class JobQueue {
  private static instance: JobQueue
  private supabase = getSupabaseAdmin()

  private constructor() {}

  static getInstance(): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue()
    }
    return JobQueue.instance
  }

  async enqueue(
    type: JobType,
    payload?: JobPayload,
    options?: {
      priority?: number
      userId?: string
      scheduledFor?: Date
      maxRetries?: number
    }
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('job_queue')
      .insert({
        type,
        payload,
        priority: options?.priority ?? 5,
        user_id: options?.userId,
        scheduled_for: options?.scheduledFor?.toISOString() ?? new Date().toISOString(),
        max_retries: options?.maxRetries ?? 3
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to enqueue job:', error)
      throw error
    }

    console.log(`Job ${data.id} enqueued: ${type}`)
    return data.id as string
  }

  async batchEnqueue(
    jobs: Array<{
      type: JobType
      payload?: JobPayload
      priority?: number
      userId?: string
      scheduledFor?: Date
    }>
  ): Promise<string[]> {
    const jobsToInsert = jobs.map(job => ({
      type: job.type,
      payload: job.payload,
      priority: job.priority ?? 5,
      user_id: job.userId,
      scheduled_for: job.scheduledFor?.toISOString() ?? new Date().toISOString(),
      max_retries: 3
    }))

    const { data, error } = await this.supabase
      .from('job_queue')
      .insert(jobsToInsert)
      .select('id')

    if (error) {
      console.error('Failed to batch enqueue jobs:', error)
      throw error
    }

    return data.map((job: any) => job.id as string)
  }

  async getNextJob(): Promise<Job | null> {
    const { data, error } = await this.supabase
      .rpc('get_next_job')

    if (error) {
      console.error('Failed to get next job:', error)
      return null
    }

    return data as unknown as Job | null
  }

  async completeJob(jobId: string, result?: any): Promise<void> {
    const { error } = await this.supabase
      .rpc('complete_job', {
        job_id: jobId,
        result_data: result
      })

    if (error) {
      console.error('Failed to complete job:', error)
      throw error
    }

    console.log(`Job ${jobId} completed`)
  }

  async failJob(jobId: string, errorMessage: string): Promise<void> {
    const { error } = await this.supabase
      .rpc('fail_job', {
        job_id: jobId,
        error_message: errorMessage
      })

    if (error) {
      console.error('Failed to mark job as failed:', error)
      throw error
    }

    console.log(`Job ${jobId} failed: ${errorMessage}`)
  }

  async getJobStatus(jobId: string): Promise<Job | null> {
    const { data, error } = await this.supabase
      .from('job_queue')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error) {
      console.error('Failed to get job status:', error)
      return null
    }

    return data as unknown as Job
  }

  async getUserJobs(userId: string, limit = 10): Promise<Job[]> {
    const { data, error } = await this.supabase
      .from('job_queue')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to get user jobs:', error)
      return []
    }

    return data as unknown as Job[]
  }

  async getPendingJobsCount(): Promise<number> {
    const { count, error } = await this.supabase
      .from('job_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())

    if (error) {
      console.error('Failed to get pending jobs count:', error)
      return 0
    }

    return count || 0
  }

  async getProcessingJobsCount(): Promise<number> {
    const { count, error } = await this.supabase
      .from('job_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'processing')

    if (error) {
      console.error('Failed to get processing jobs count:', error)
      return 0
    }

    return count || 0
  }

  async cleanupOldJobs(daysToKeep = 7): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const { data, error } = await this.supabase
      .from('job_queue')
      .delete()
      .in('status', ['completed', 'failed'])
      .lt('completed_at', cutoffDate.toISOString())
      .select('id')

    if (error) {
      console.error('Failed to cleanup old jobs:', error)
      return 0
    }

    return data?.length || 0
  }

  async breakLongRunningTask(
    originalJobId: string,
    chunks: Array<{
      type: JobType
      payload: JobPayload
      priority?: number
    }>
  ): Promise<string[]> {
    const { data: originalJob } = await this.supabase
      .from('job_queue')
      .select('user_id')
      .eq('id', originalJobId)
      .single()

    const jobs = chunks.map(chunk => ({
      ...chunk,
      userId: originalJob?.user_id as string | undefined,
      priority: chunk.priority ?? 5
    }))

    return this.batchEnqueue(jobs)
  }
}