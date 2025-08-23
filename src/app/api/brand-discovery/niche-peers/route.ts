import { NextRequest, NextResponse } from 'next/server'
import { BrandDiscoveryService } from '@/lib/brand-discovery/discovery-service'
import { withAuthAndValidation, withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// GET - Discover brands from niche peers (authenticated users only)
export const GET = withSecurityHeaders(
  rateLimit(10, 300000)( // 10 requests per 5 minutes (expensive operation)
    withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
      try {
        // Parse and validate limit parameter
        const url = new URL(request.url)
        const limitParam = url.searchParams.get('limit')
        let limit = 10
        
        if (limitParam) {
          const parsed = parseInt(limitParam)
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 50) {
            limit = parsed
          }
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

        // Get additional info about top discovered brands (limit to prevent excessive API calls)
        const enrichedBrands = []
        for (const brand of newBrands.slice(0, Math.min(limit, 10))) {
          try {
            const research = await discoveryService.researchBrand(brand.instagram_handle || '')
            enrichedBrands.push({
              brand_name: brand.brand_name,
              instagram_handle: brand.instagram_handle,
              website: brand.website,
              industry: (brand as any).industry || 'Unknown',
              research: research ? {
                bio: (research as any).instagram_data?.bio?.substring(0, 200), // Limit bio length
                follower_count: (research as any).instagram_data?.follower_count,
                engagement_rate: (research as any).engagement_rate
                // Don't expose internal research data
              } : null
            })
          } catch (researchError) {
            // If research fails, include basic brand info
            enrichedBrands.push({
              brand_name: brand.brand_name,
              instagram_handle: brand.instagram_handle,
              website: brand.website,
              industry: (brand as any).industry || 'Unknown',
              research: null
            })
          }
        }

        return NextResponse.json({
          success: true,
          discovered_brands: enrichedBrands,
          total_found: Math.min(newBrands.length, 100), // Don't expose exact large numbers
          discovery_method: 'niche_peer_analysis',
          limit_applied: Math.min(limit, 10)
        })

      } catch (error) {
        console.error('Error discovering brands:', error)
        return NextResponse.json(
          { error: 'Failed to discover brands from niche peers' },
          { status: 500 }
        )
      }
    })
  )
)