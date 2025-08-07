import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { EnhancedBrandMatchingService } from '@/lib/brand-matching/enhanced-matching-service'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const matchingService = new EnhancedBrandMatchingService()
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user has completed brand matching onboarding
    const { data: profile } = await supabaseAdmin
      .from('creator_profiles')
      .select('profile_data')
      .eq('user_id', userId)
      .single()

    if (!(profile as any)?.profile_data?.identity) {
      return NextResponse.json({ 
        error: 'Brand matching profile not completed',
        requiresOnboarding: true 
      }, { status: 400 })
    }

    // Get matches from the service
    const matchData = await matchingService.getMatchesForCreator(userId, {
      limit: 100,
      minScore: 50,
      excludeMatched: false // Show all matches including previously matched
    })

    // Get similar brand suggestions based on past collaborations
    const similarBrands = await matchingService.getSimilarBrandMatches(userId)

    // Get user's brand requests
    const brandRequests = await matchingService.getUserRequestedBrands(userId)

    return NextResponse.json({
      success: true,
      matches: matchData.matches,
      stats: matchData.matchStats,
      totalAnalyzed: matchData.totalBrandsAnalyzed,
      similarBrandSuggestions: similarBrands,
      pendingRequests: brandRequests.filter((r: any) => r.status === 'pending').length
    })

  } catch (error) {
    console.error('Error fetching brand matches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brand matches' },
      { status: 500 }
    )
  }
}

// POST endpoint to manually trigger match recalculation
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const matchingService = new EnhancedBrandMatchingService()
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Clear existing matches to force recalculation
    await supabaseAdmin
      .from('user_brand_matches')
      .delete()
      .eq('user_id', userId)

    // Get fresh matches
    const matchData = await matchingService.getMatchesForCreator(userId, {
      limit: 100,
      minScore: 50,
      excludeMatched: false
    })

    return NextResponse.json({
      success: true,
      message: 'Matches recalculated successfully',
      matches: matchData.matches,
      stats: matchData.matchStats
    })

  } catch (error) {
    console.error('Error recalculating matches:', error)
    return NextResponse.json(
      { error: 'Failed to recalculate matches' },
      { status: 500 }
    )
  }
}