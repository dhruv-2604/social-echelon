import { NextRequest, NextResponse } from 'next/server'
import { InstagramAPI } from '@/lib/instagram'

export async function GET(request: NextRequest) {
  try {
    const authUrl = InstagramAPI.getAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Instagram auth error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Instagram authentication' },
      { status: 500 }
    )
  }
}