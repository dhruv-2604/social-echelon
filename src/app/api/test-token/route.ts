import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json()
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 })
    }

    console.log('Testing access token:', accessToken.substring(0, 20) + '...')

    // Test 1: Get user's pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`
    )
    const pagesData = await pagesResponse.json()
    
    console.log('Pages response:', pagesData)

    // Test 2: Get user info
    const userResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${accessToken}`
    )
    const userData = await userResponse.json()

    console.log('User response:', userData)

    // Test 3: If we find pages with Instagram, try to get Instagram data
    let instagramData = null
    if (pagesData.data && pagesData.data.length > 0) {
      const pageWithInstagram = pagesData.data.find((page: any) => page.instagram_business_account)
      
      if (pageWithInstagram) {
        const instagramId = pageWithInstagram.instagram_business_account.id
        console.log('Found Instagram account:', instagramId)
        
        const instagramResponse = await fetch(
          `https://graph.facebook.com/v18.0/${instagramId}?fields=id,username,name,followers_count,follows_count,media_count,profile_picture_url&access_token=${accessToken}`
        )
        instagramData = await instagramResponse.json()
        console.log('Instagram data:', instagramData)
      }
    }

    return NextResponse.json({
      success: true,
      user: userData,
      pages: pagesData,
      instagram: instagramData
    })

  } catch (error) {
    console.error('Token test error:', error)
    return NextResponse.json(
      { error: 'Failed to test token' },
      { status: 500 }
    )
  }
}