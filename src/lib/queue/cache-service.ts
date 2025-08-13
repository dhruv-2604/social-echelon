import { getSupabaseAdmin } from '@/lib/supabase-admin'
import crypto from 'crypto'

export type CacheType = 
  | 'instagram_media'
  | 'instagram_insights'
  | 'instagram_profile'
  | 'openai_response'
  | 'trend_data'
  | 'brand_matching'
  | 'algorithm_detection'

export interface CacheEntry {
  id: string
  cache_key: string
  cache_type: CacheType
  data: any
  metadata?: any
  expires_at: string
  created_at: string
  accessed_at: string
  access_count: number
}

export class CacheService {
  private static instance: CacheService
  private supabase = getSupabaseAdmin()
  
  private static DEFAULT_TTL = {
    instagram_media: 3600, // 1 hour
    instagram_insights: 3600, // 1 hour
    instagram_profile: 1800, // 30 minutes
    openai_response: 86400, // 24 hours
    trend_data: 21600, // 6 hours
    brand_matching: 2592000, // 30 days
    algorithm_detection: 3600 // 1 hour
  }

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  private generateCacheKey(type: CacheType, identifier: string): string {
    const hash = crypto.createHash('sha256')
    hash.update(`${type}:${identifier}`)
    return hash.digest('hex')
  }

  async get<T = any>(
    type: CacheType,
    identifier: string
  ): Promise<T | null> {
    const cacheKey = this.generateCacheKey(type, identifier)
    
    const { data, error } = await this.supabase
      .from('cache_results')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) {
      return null
    }

    // Update access count and timestamp
    await this.supabase
      .from('cache_results')
      .update({
        accessed_at: new Date().toISOString(),
        access_count: (data as any).access_count + 1
      })
      .eq('id', (data as any).id)

    console.log(`Cache hit: ${type}:${identifier}`)
    return data.data as T
  }

  async set<T = any>(
    type: CacheType,
    identifier: string,
    data: T,
    options?: {
      ttl?: number // seconds
      metadata?: any
    }
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(type, identifier)
    const ttl = options?.ttl ?? CacheService.DEFAULT_TTL[type]
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + ttl)

    const { error } = await this.supabase
      .from('cache_results')
      .upsert({
        cache_key: cacheKey,
        cache_type: type,
        data,
        metadata: options?.metadata,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        accessed_at: new Date().toISOString(),
        access_count: 1
      }, {
        onConflict: 'cache_key'
      })

    if (error) {
      console.error('Failed to set cache:', error)
      throw error
    }

    console.log(`Cache set: ${type}:${identifier} (TTL: ${ttl}s)`)
  }

  async invalidate(type: CacheType, identifier: string): Promise<void> {
    const cacheKey = this.generateCacheKey(type, identifier)
    
    const { error } = await this.supabase
      .from('cache_results')
      .delete()
      .eq('cache_key', cacheKey)

    if (error) {
      console.error('Failed to invalidate cache:', error)
      throw error
    }

    console.log(`Cache invalidated: ${type}:${identifier}`)
  }

  async invalidateByType(type: CacheType): Promise<number> {
    const { data, error } = await this.supabase
      .from('cache_results')
      .delete()
      .eq('cache_type', type)
      .select('id')

    if (error) {
      console.error('Failed to invalidate cache by type:', error)
      return 0
    }

    console.log(`Cache invalidated: ${data?.length || 0} entries of type ${type}`)
    return data?.length || 0
  }

  async cleanupExpired(): Promise<number> {
    const { data, error } = await this.supabase
      .from('cache_results')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id')

    if (error) {
      console.error('Failed to cleanup expired cache:', error)
      return 0
    }

    console.log(`Cleaned up ${data?.length || 0} expired cache entries`)
    return data?.length || 0
  }

  async getStats(): Promise<{
    totalEntries: number
    byType: Record<CacheType, number>
    totalSize: number
    hitRate: number
  }> {
    const { data, error } = await this.supabase
      .from('cache_results')
      .select('cache_type, access_count')

    if (error) {
      console.error('Failed to get cache stats:', error)
      return {
        totalEntries: 0,
        byType: {} as Record<CacheType, number>,
        totalSize: 0,
        hitRate: 0
      }
    }

    const byType: Record<string, number> = {}
    let totalHits = 0
    let totalAccesses = 0

    for (const entry of data || []) {
      const e = entry as any
      byType[e.cache_type] = (byType[e.cache_type] || 0) + 1
      totalHits += e.access_count > 1 ? 1 : 0
      totalAccesses += 1
    }

    return {
      totalEntries: data?.length || 0,
      byType: byType as Record<CacheType, number>,
      totalSize: 0, // Would need to calculate actual data size
      hitRate: totalAccesses > 0 ? (totalHits / totalAccesses) * 100 : 0
    }
  }

  // Helper method for Instagram API caching
  async getInstagramData<T = any>(
    endpoint: string,
    accessToken: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const identifier = `${endpoint}:${accessToken.substring(0, 8)}`
    
    // Check cache first
    const cached = await this.get<T>('instagram_media', identifier)
    if (cached) {
      return cached
    }

    // Fetch from API
    const data = await fetcher()
    
    // Cache the result
    await this.set('instagram_media', identifier, data)
    
    return data
  }

  // Helper method for OpenAI API caching
  async getOpenAIResponse<T = any>(
    prompt: string,
    params: any,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const identifier = `${prompt}:${JSON.stringify(params)}`
    
    // Check cache first
    const cached = await this.get<T>('openai_response', identifier)
    if (cached) {
      return cached
    }

    // Fetch from API
    const data = await fetcher()
    
    // Cache the result
    await this.set('openai_response', identifier, data)
    
    return data
  }
}