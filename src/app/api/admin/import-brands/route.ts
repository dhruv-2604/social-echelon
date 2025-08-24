import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withSecurityHeaders } from '@/lib/validation/middleware'

export const dynamic = 'force-dynamic'

interface BrandImport {
  name: string
  instagram_handle: string
  location: string
  followers: string
  industry: string
  industry_niche: string
  influencer_types: string
  ships_to: string
  recent_campaigns: string
  strategy: string
}

// POST - Import brands from CSV data
export const POST = withSecurityHeaders(
  async (request: NextRequest) => {
    try {
      // Check admin authorization
      const adminSecret = request.headers.get('x-admin-secret')
      if (adminSecret !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const body = await request.json()
      const { brands, mode = 'upsert' } = body as { brands: BrandImport[], mode?: 'upsert' | 'insert' }

      if (!brands || !Array.isArray(brands)) {
        return NextResponse.json({ error: 'Invalid brands data' }, { status: 400 })
      }

      const supabase = getSupabaseAdmin()
      
      console.log(`Importing ${brands.length} brands in ${mode} mode`)

      // Process brands in batches of 50
      const batchSize = 50
      let totalImported = 0
      let errors = []

      for (let i = 0; i < brands.length; i += batchSize) {
        const batch = brands.slice(i, i + batchSize)
        
        try {
          if (mode === 'upsert') {
            // Upsert (update or insert)
            const { data, error } = await supabase
              .from('brands')
              .upsert(
                batch.map(brand => ({
                  name: brand.name,
                  instagram_handle: brand.instagram_handle,
                  location: brand.location,
                  followers: brand.followers,
                  industry: brand.industry,
                  industry_niche: brand.industry_niche,
                  influencer_types: brand.influencer_types,
                  ships_to: brand.ships_to,
                  recent_campaigns: brand.recent_campaigns,
                  strategy: brand.strategy,
                  last_updated: new Date().toISOString()
                })),
                { onConflict: 'name' }
              )

            if (error) {
              errors.push({ batch: i / batchSize + 1, error: error.message })
            } else {
              totalImported += batch.length
            }
          } else {
            // Insert only (skip duplicates)
            for (const brand of batch) {
              const { error } = await supabase
                .from('brands')
                .insert({
                  name: brand.name,
                  instagram_handle: brand.instagram_handle,
                  location: brand.location,
                  followers: brand.followers,
                  industry: brand.industry,
                  industry_niche: brand.industry_niche,
                  influencer_types: brand.influencer_types,
                  ships_to: brand.ships_to,
                  recent_campaigns: brand.recent_campaigns,
                  strategy: brand.strategy
                })

              if (!error) {
                totalImported++
              }
            }
          }
        } catch (error) {
          errors.push({ batch: i / batchSize + 1, error: String(error) })
        }
      }

      // Get total count
      const { count } = await supabase
        .from('brands')
        .select('*', { count: 'exact', head: true })

      return NextResponse.json({
        success: true,
        imported: totalImported,
        total_brands: count,
        errors: errors.length > 0 ? errors : undefined
      })

    } catch (error) {
      console.error('Brand import error:', error)
      return NextResponse.json(
        { error: 'Failed to import brands' },
        { status: 500 }
      )
    }
  }
)