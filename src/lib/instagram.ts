const INSTAGRAM_BASE_URL = 'https://graph.instagram.com'
const INSTAGRAM_AUTH_URL = 'https://api.instagram.com/oauth/authorize'

export interface InstagramProfile {
  id: string
  username: string
  account_type: string
  media_count: number
}

export interface InstagramMedia {
  id: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url: string
  permalink: string
  caption?: string
  timestamp: string
  like_count?: number
  comments_count?: number
}

export class InstagramAPI {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  static getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID!,
      redirect_uri: process.env.INSTAGRAM_REDIRECT_URI!,
      scope: 'user_profile,user_media',
      response_type: 'code',
    })

    return `${INSTAGRAM_AUTH_URL}?${params.toString()}`
  }

  static async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_CLIENT_ID!,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: process.env.INSTAGRAM_REDIRECT_URI!,
        code,
      }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error_message || 'Failed to exchange code for token')
    }

    // Exchange short-lived token for long-lived token
    const longLivedResponse = await fetch(
      `${INSTAGRAM_BASE_URL}/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_CLIENT_SECRET}&access_token=${data.access_token}`
    )

    const longLivedData = await longLivedResponse.json()
    
    if (!longLivedResponse.ok) {
      throw new Error(longLivedData.error?.message || 'Failed to get long-lived token')
    }

    return longLivedData.access_token
  }

  async getProfile(): Promise<InstagramProfile> {
    const response = await fetch(
      `${INSTAGRAM_BASE_URL}/me?fields=id,username,account_type,media_count&access_token=${this.accessToken}`
    )

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch profile')
    }

    return data
  }

  async getMedia(limit: number = 25): Promise<InstagramMedia[]> {
    const response = await fetch(
      `${INSTAGRAM_BASE_URL}/me/media?fields=id,media_type,media_url,permalink,caption,timestamp,like_count,comments_count&limit=${limit}&access_token=${this.accessToken}`
    )

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch media')
    }

    return data.data || []
  }

  async getInsights(mediaId: string): Promise<any> {
    const response = await fetch(
      `${INSTAGRAM_BASE_URL}/${mediaId}/insights?metric=impressions,reach,engagement&access_token=${this.accessToken}`
    )

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch insights')
    }

    return data.data || []
  }
}