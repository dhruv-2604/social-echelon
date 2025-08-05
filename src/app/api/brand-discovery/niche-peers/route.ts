import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { BrandDiscoveryService } from '@/lib/brand-discovery/discovery-service'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const discoveryService = new BrandDiscoveryService()
    
    // Discover brands from peers in the same niche
    const discoveredBrands = await discoveryService.discoverFromNichePeers(userId)
    
    // Get brands the creator has already worked with to filter them out
    const existingBrands = await discoveryService.getCreatorExistingBrands(userId)
    
    // Filter out brands they've already worked with
    const newBrands = discoveredBrands.filter(
      brand => !existingBrands.includes(brand.brand_name.toLowerCase())
    )

    // Get additional info about top discovered brands
    const enrichedBrands = []
    for (const brand of newBrands.slice(0, 10)) { // Top 10 brands
      const research = await discoveryService.researchBrand(brand.instagram_handle || '')
      enrichedBrands.push({
        ...brand,
        research
      })
    }

    return NextResponse.json({
      success: true,
      discovered_brands: enrichedBrands,
      total_found: newBrands.length,
      discovery_method: 'niche_peer_analysis'
    })

  } catch (error) {
    console.error('Error discovering brands:', error)
    return NextResponse.json(
      { error: 'Failed to discover brands' },
      { status: 500 }
    )
  }
}