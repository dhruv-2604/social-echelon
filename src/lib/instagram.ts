const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v18.0'
const FACEBOOK_AUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth'

export interface InstagramProfile {
  id: string
  username: string
  name: string
  media_count: number
  followers_count: number
  follows_count: number
  profile_picture_url: string
  website?: string
  biography?: string
}

export interface InstagramMedia {
  id: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS'
  media_url: string
  permalink: string
  caption?: string
  timestamp: string
  like_count?: number
  comments_count?: number
  thumbnail_url?: string
}

export interface InstagramInsights {
  impressions: number
  reach: number
  engagement: number
  saved: number
  video_views?: number
}

export class InstagramAPI {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  static getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID!,
      redirect_uri: process.env.FACEBOOK_REDIRECT_URI!,
      scope: 'pages_show_list,business_management,instagram_basic,instagram_manage_comments,instagram_manage_insights,instagram_content_publish,instagram_manage_messages,pages_read_engagement',
      response_type: 'code',
      state: 'instagram_auth'
    })

    return `${FACEBOOK_AUTH_URL}?${params.toString()}`
  }

  static async exchangeCodeForToken(code: string): Promise<string> {
    console.log('Exchanging code for token...')
    
    // Exchange code for Facebook access token
    const url = new URL(`${FACEBOOK_GRAPH_URL}/oauth/access_token`)
    url.searchParams.append('client_id', process.env.FACEBOOK_APP_ID!)
    url.searchParams.append('client_secret', process.env.FACEBOOK_APP_SECRET!)
    url.searchParams.append('redirect_uri', process.env.FACEBOOK_REDIRECT_URI!)
    url.searchParams.append('code', code)

    console.log('Token exchange URL:', url.toString().replace(process.env.FACEBOOK_APP_SECRET!, 'SECRET_HIDDEN'))

    const tokenResponse = await fetch(url.toString())
    const tokenData = await tokenResponse.json()
    
    console.log('Token response status:', tokenResponse.status)
    console.log('Token response data:', tokenData)
    
    if (!tokenResponse.ok) {
      throw new Error(tokenData.error?.message || `Token exchange failed: ${JSON.stringify(tokenData)}`)
    }

    if (!tokenData.access_token) {
      throw new Error('No access token received from Facebook')
    }

    // Exchange short-lived token for long-lived token
    const longLivedUrl = new URL(`${FACEBOOK_GRAPH_URL}/oauth/access_token`)
    longLivedUrl.searchParams.append('grant_type', 'fb_exchange_token')
    longLivedUrl.searchParams.append('client_id', process.env.FACEBOOK_APP_ID!)
    longLivedUrl.searchParams.append('client_secret', process.env.FACEBOOK_APP_SECRET!)
    longLivedUrl.searchParams.append('fb_exchange_token', tokenData.access_token)

    const longLivedResponse = await fetch(longLivedUrl.toString())
    const longLivedData = await longLivedResponse.json()
    
    console.log('Long-lived token response:', longLivedResponse.status, longLivedData)
    
    if (!longLivedResponse.ok) {
      // If long-lived exchange fails, just use the short-lived token
      console.warn('Long-lived token exchange failed, using short-lived token')
      return tokenData.access_token
    }

    return longLivedData.access_token || tokenData.access_token
  }

  async getInstagramBusinessAccount(): Promise<string> {
    console.log('Getting Instagram Business Account...')
    
    // First get Facebook pages with access token
    const pagesResponse = await fetch(
      `${FACEBOOK_GRAPH_URL}/me/accounts?fields=id,name,instagram_business_account,access_token&access_token=${this.accessToken}`
    )
    
    const pagesData = await pagesResponse.json()
    
    console.log('Pages response status:', pagesResponse.status)
    console.log('Pages data:', JSON.stringify(pagesData, null, 2))
    
    if (!pagesResponse.ok) {
      throw new Error(pagesData.error?.message || 'Failed to fetch pages')
    }

    // Log all pages found
    if (pagesData.data && pagesData.data.length > 0) {
      console.log('Found pages:', pagesData.data.map((page: any) => ({
        id: page.id,
        name: page.name,
        hasInstagram: !!page.instagram_business_account
      })))
    } else {
      console.log('No pages found in response')
    }

    // Find page with Instagram business account
    const pageWithInstagram = pagesData.data?.find((page: any) => page.instagram_business_account)
    
    if (!pageWithInstagram) {
      console.error('No page with Instagram Business Account found')
      console.error('Available pages:', pagesData.data)
      throw new Error('No Instagram Business Account found. Please connect an Instagram Business Account to your Facebook Page.')
    }

    console.log('Found Instagram Business Account:', pageWithInstagram.instagram_business_account.id)
    return pageWithInstagram.instagram_business_account.id
  }

  async getProfile(): Promise<InstagramProfile> {
    const instagramAccountId = await this.getInstagramBusinessAccount()
    
    const response = await fetch(
      `${FACEBOOK_GRAPH_URL}/${instagramAccountId}?fields=id,username,name,media_count,followers_count,follows_count,profile_picture_url,website,biography&access_token=${this.accessToken}`
    )

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch Instagram profile')
    }

    return data
  }

  async getMedia(limit: number = 25): Promise<InstagramMedia[]> {
    const instagramAccountId = await this.getInstagramBusinessAccount()
    
    const response = await fetch(
      `${FACEBOOK_GRAPH_URL}/${instagramAccountId}/media?fields=id,media_type,media_url,permalink,caption,timestamp,like_count,comments_count,thumbnail_url&limit=${limit}&access_token=${this.accessToken}`
    )

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch media')
    }

    return data.data || []
  }

  async getInsights(mediaId: string): Promise<InstagramInsights> {
    const response = await fetch(
      `${FACEBOOK_GRAPH_URL}/${mediaId}/insights?metric=impressions,reach,engagement,saved,video_views&access_token=${this.accessToken}`
    )

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch insights')
    }

    // Transform the insights data into a more usable format
    const insights: any = {}
    data.data?.forEach((insight: any) => {
      insights[insight.name] = insight.values[0]?.value || 0
    })

    return {
      impressions: insights.impressions || 0,
      reach: insights.reach || 0,
      engagement: insights.engagement || 0,
      saved: insights.saved || 0,
      video_views: insights.video_views || 0
    }
  }

  async getAccountInsights(): Promise<{
    impressions: number
    reach: number
    profile_views: number
    period: string
  }> {
    console.log('Getting account insights...')
    const instagramAccountId = await this.getInstagramBusinessAccount()
    console.log('Instagram Business Account ID:', instagramAccountId)
    
    // Get insights for the last 2 days to ensure we have data
    const url = `${FACEBOOK_GRAPH_URL}/${instagramAccountId}/insights?metric=impressions,reach,profile_views&period=day&access_token=${this.accessToken}`
    console.log('Fetching insights from:', url.replace(this.accessToken, 'TOKEN_HIDDEN'))
    
    const response = await fetch(url)
    const data = await response.json()
    
    console.log('Insights API response status:', response.status)
    console.log('Insights API response:', JSON.stringify(data, null, 2))
    
    if (!response.ok) {
      console.error('Account insights error:', data)
      throw new Error(data.error?.message || 'Failed to fetch account insights')
    }

    // Parse the response to extract the latest values
    const insights: any = {
      impressions: 0,
      reach: 0,
      profile_views: 0,
      period: 'day'
    }

    data.data?.forEach((metric: any) => {
      // Get the most recent value (last element in values array)
      const latestValue = metric.values?.[metric.values.length - 1]?.value || 0
      insights[metric.name] = latestValue
      console.log(`Metric ${metric.name}: ${latestValue}`)
    })

    console.log('Parsed insights:', insights)
    return insights
  }
}