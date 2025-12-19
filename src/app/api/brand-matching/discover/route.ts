/**
 * Brand Discovery API
 *
 * POST /api/brand-matching/discover
 * Triggered after onboarding - finds similar brands and queues missing ones
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSimilarBrandFinder } from '@/lib/brand-matching/similar-brand-finder'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const DiscoverSchema = z.object({
  userId: z.string().uuid()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = DiscoverSchema.parse(body)

    const supabase = getSupabaseAdmin()

    // Get creator's profile data with dream brands and past brands
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('creator_data')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Creator profile not found' },
        { status: 404 }
      )
    }

    const profileData = (profile as any).creator_data || {}
    const dreamBrands = profileData?.identity?.dreamBrands || []
    const pastBrands = profileData?.identity?.pastBrands || []

    if (dreamBrands.length === 0 && pastBrands.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No dream or past brands to process',
        similarBrands: 0,
        brandRequests: 0
      })
    }

    // Find similar brands
    const finder = getSimilarBrandFinder()
    const { similarBrands, missingBrands } = await finder.findSimilarBrands(
      dreamBrands,
      pastBrands,
      userId
    )

    // Queue missing brands for admin review
    for (const missing of missingBrands) {
      await supabase.rpc('upsert_brand_request', {
        p_brand_name: missing.brandName,
        p_requested_by: missing.requestedBy,
        p_source: missing.source
      })
    }

    // Create matches for similar brands found
    if (similarBrands.length > 0) {
      const matchesToInsert = similarBrands.map(brand => ({
        user_id: userId,
        brand_id: brand.id,
        match_score: brand.similarityScore,
        match_reasons: [brand.matchReason, `Similar to: ${brand.dreamBrandMatched}`],
        status: 'pending',
        discovery_source: 'dream_brand_similarity',
        created_at: new Date().toISOString()
      }))

      // Upsert to avoid duplicates
      const { error: insertError } = await supabase
        .from('user_brand_matches')
        .upsert(matchesToInsert, {
          onConflict: 'user_id,brand_id',
          ignoreDuplicates: true
        })

      if (insertError) {
        console.error('Error inserting matches:', insertError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Found ${similarBrands.length} similar brands, queued ${missingBrands.length} for research`,
      similarBrands: similarBrands.length,
      brandRequests: missingBrands.length,
      topMatches: similarBrands.slice(0, 5).map(b => ({
        name: b.name,
        score: b.similarityScore,
        reason: b.matchReason
      }))
    })

  } catch (error) {
    console.error('Brand discovery error:', error)
    return NextResponse.json(
      { error: 'Discovery failed' },
      { status: 500 }
    )
  }
}
