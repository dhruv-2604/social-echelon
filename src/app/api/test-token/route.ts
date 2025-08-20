import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate input
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { accessToken } = body
    
    // Input validation
    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json({ error: 'Valid access token required' }, { status: 400 })
    }

    // Sanitize token for logging (never log full tokens)
    const tokenPreview = accessToken.substring(0, 10) + '...'

    // Test 1: Get user's pages with timeout
    const pagesResponse = await Promise.race([
      fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
    ]) as Response
    
    if (!pagesResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch pages', details: 'Invalid token or permissions' },
        { status: 400 }
      )
    }
    
    const pagesData = await pagesResponse.json()

    // Test 2: Get user info with timeout
    const userResponse = await Promise.race([
      fetch(`https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${accessToken}`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
    ]) as Response
    
    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch user data', details: 'Invalid token' },
        { status: 400 }
      )
    }
    
    const userData = await userResponse.json()

    // Test 3: If we find pages with Instagram, try to get Instagram data
    let instagramData = null
    if (pagesData.data && pagesData.data.length > 0) {
      const pageWithInstagram = pagesData.data.find((page: any) => page.instagram_business_account)
      
      if (pageWithInstagram) {
        const instagramId = pageWithInstagram.instagram_business_account.id
        
        try {
          const instagramResponse = await Promise.race([
            fetch(
              `https://graph.facebook.com/v18.0/${instagramId}?fields=id,username,name,followers_count,follows_count,media_count,profile_picture_url&access_token=${accessToken}`
            ),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
          ]) as Response
          
          if (instagramResponse.ok) {
            instagramData = await instagramResponse.json()
          }
        } catch (error) {
          // Silently fail for Instagram data - it's optional
          instagramData = { error: 'Failed to fetch Instagram data' }
        }
      }
    }

    return NextResponse.json({
      success: true,
      user: userData,
      pages: pagesData,
      instagram: instagramData
    })

  } catch (error) {
    // Don't expose internal error details
    return NextResponse.json(
      { error: 'Failed to test token' },
      { status: 500 }
    )
  }
}