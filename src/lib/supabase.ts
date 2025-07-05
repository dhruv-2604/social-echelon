import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string
          full_name: string | null
          avatar_url: string | null
          instagram_username: string | null
          instagram_id: string | null
          follower_count: number | null
          following_count: number | null
          posts_count: number | null
          engagement_rate: number | null
          niche: string | null
          subscription_tier: 'basic' | 'pro' | null
          subscription_status: 'active' | 'inactive' | 'cancelled' | null
          stripe_customer_id: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          instagram_username?: string | null
          instagram_id?: string | null
          follower_count?: number | null
          following_count?: number | null
          posts_count?: number | null
          engagement_rate?: number | null
          niche?: string | null
          subscription_tier?: 'basic' | 'pro' | null
          subscription_status?: 'active' | 'inactive' | 'cancelled' | null
          stripe_customer_id?: string | null
        }
        Update: {
          updated_at?: string
          full_name?: string | null
          avatar_url?: string | null
          instagram_username?: string | null
          instagram_id?: string | null
          follower_count?: number | null
          following_count?: number | null
          posts_count?: number | null
          engagement_rate?: number | null
          niche?: string | null
          subscription_tier?: 'basic' | 'pro' | null
          subscription_status?: 'active' | 'inactive' | 'cancelled' | null
          stripe_customer_id?: string | null
        }
      }
      instagram_posts: {
        Row: {
          id: string
          profile_id: string
          instagram_post_id: string
          caption: string | null
          media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
          media_url: string
          permalink: string
          timestamp: string
          like_count: number | null
          comments_count: number | null
          created_at: string
        }
        Insert: {
          profile_id: string
          instagram_post_id: string
          caption?: string | null
          media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
          media_url: string
          permalink: string
          timestamp: string
          like_count?: number | null
          comments_count?: number | null
        }
        Update: {
          caption?: string | null
          like_count?: number | null
          comments_count?: number | null
        }
      }
      user_tokens: {
        Row: {
          id: string
          user_id: string
          instagram_access_token: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          instagram_access_token: string
        }
        Update: {
          instagram_access_token?: string
          updated_at?: string
        }
      }
    }
  }
}