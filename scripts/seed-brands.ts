import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface BrandData {
  brand_name: string
  display_name: string
  instagram_handle: string
  industry: string
  headquarters_country: string
  headquarters_city: string
  ships_to_countries?: string
  followers?: string
  preferred_creator_size?: string
  influencer_types?: string
  sub_industry?: string
  recent_campaigns?: string
  influencer_strategy?: string
}

async function seedBrands() {
  try {
    // Read CSV file
    const csvPath = path.join(process.cwd(), 'data', 'brands.csv')
    const fileContent = fs.readFileSync(csvPath, 'utf-8')
    
    // Parse CSV
    const records: BrandData[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    console.log(`Found ${records.length} brands to import`)

    // Helper function to determine company size from followers
    function getCompanySize(followers: string): string {
      if (!followers) return 'medium'
      const cleanNum = followers.toUpperCase().replace(/[,]/g, '')
      let count = 0
      
      if (cleanNum.endsWith('K')) {
        count = parseFloat(cleanNum.replace('K', '')) * 1000
      } else if (cleanNum.endsWith('M')) {
        count = parseFloat(cleanNum.replace('M', '')) * 1000000
      } else {
        count = parseInt(cleanNum) || 0
      }
      
      if (count < 10000) return 'startup'
      if (count < 100000) return 'small'
      if (count < 1000000) return 'medium'
      return 'large'
    }

    // Helper function to map influencer types to brand values
    function mapInfluencerTypesToValues(types: string): string[] {
      if (!types) return []
      const values: string[] = []
      const typesLower = types.toLowerCase()
      
      if (typesLower.includes('sustainability') || typesLower.includes('sustainable')) values.push('sustainability')
      if (typesLower.includes('diversity') || typesLower.includes('inclusive')) values.push('diversity', 'inclusivity')
      if (typesLower.includes('beauty')) values.push('beauty', 'self-care')
      if (typesLower.includes('fashion')) values.push('style', 'trends')
      if (typesLower.includes('nano') || typesLower.includes('micro')) values.push('authenticity', 'community')
      if (typesLower.includes('celebrity') || typesLower.includes('mega')) values.push('luxury', 'premium')
      if (typesLower.includes('tiktok')) values.push('creativity', 'entertainment')
      if (typesLower.includes('minimalist')) values.push('minimalism', 'quality')
      if (typesLower.includes('advocates')) values.push('activism', 'social-impact')
      if (typesLower.includes('trendy')) values.push('innovation', 'trends')
      if (typesLower.includes('esthetician')) values.push('expertise', 'professional')
      
      return [...new Set(values)] // Remove duplicates
    }

    // Transform and validate data
    const brandsToInsert = records.map(record => {
      // Helper to convert common country names to ISO codes
      function toISO(country: string): string {
        const mapping: Record<string, string> = {
          'USA': 'US',
          'UK': 'GB',
          'SWE': 'SE',
          'UNITED STATES': 'US',
          'UNITED KINGDOM': 'GB',
          'SWEDEN': 'SE',
          'CANADA': 'CA',
          'AUSTRALIA': 'AU'
        }
        const upper = country.toUpperCase().trim()
        return mapping[upper] || upper
      }

      // Parse array fields (separated by | in CSV)
      let ships_to_countries = ['US'] // Default
      
      if (record.ships_to_countries) {
        const shipsList = record.ships_to_countries.toUpperCase().trim()
        
        // Special handling for global brands
        if (shipsList === 'GLOBAL' || shipsList === 'WORLDWIDE' || shipsList === 'ALL') {
          // List of major markets for global brands
          ships_to_countries = ['US', 'CA', 'GB', 'AU', 'FR', 'DE', 'IT', 'ES', 'NL', 'SE', 
                               'JP', 'KR', 'BR', 'MX', 'IN', 'CN', 'AE', 'SG', 'NZ', 'CH']
        } else {
          ships_to_countries = record.ships_to_countries.split('|').map(c => toISO(c))
        }
      }

      // Determine if local only based on location data
      const is_local_only = ships_to_countries.length === 1 && 
        ships_to_countries[0] === record.headquarters_country?.toUpperCase() &&
        (record.sub_industry?.toLowerCase().includes('restaurant') || 
         record.sub_industry?.toLowerCase().includes('cafe') ||
         record.sub_industry?.toLowerCase().includes('local'))

      const preferred_creator_size = record.preferred_creator_size
        ? record.preferred_creator_size.split('|').map(s => s.trim())
        : ['micro', 'macro'] // Default sizes

      // Auto-determine company size from followers
      const company_size = getCompanySize(record.followers)

      // Map influencer types to brand values
      const brand_values = mapInfluencerTypesToValues(record.influencer_types)

      return {
        brand_name: record.brand_name.toLowerCase().trim(),
        display_name: record.display_name.trim(),
        instagram_handle: record.instagram_handle.toLowerCase().replace('@', '').trim(),
        industry: record.industry.trim(),
        sub_industry: record.sub_industry?.trim() || null,
        headquarters_country: toISO(record.headquarters_country),
        headquarters_city: record.headquarters_city.trim(),
        ships_to_countries,
        is_local_only,
        preferred_creator_size,
        pr_email: null, // To be added later
        website_url: null, // Not needed
        company_size,
        content_formats: ['posts', 'reels', 'stories'], // All formats supported
        brand_values,
        recent_campaigns: record.recent_campaigns?.trim() || null,
        influencer_strategy: record.influencer_strategy?.trim() || null,
        
        // Set defaults
        works_with_influencers: true,
        is_active: true,
        discovery_source: 'admin', // Since you're importing these
        verification_status: 'unverified',
        preferred_contact_method: 'email'
      }
    })

    // Insert in batches of 50 to avoid timeouts
    const batchSize = 50
    let inserted = 0
    let skipped = 0

    for (let i = 0; i < brandsToInsert.length; i += batchSize) {
      const batch = brandsToInsert.slice(i, i + batchSize)
      
      // Use upsert to avoid duplicates
      const { data, error } = await supabase
        .from('brands')
        .upsert(batch, { 
          onConflict: 'brand_name',
          ignoreDuplicates: false 
        })
        .select()

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error)
        continue
      }

      inserted += data?.length || 0
      console.log(`Inserted batch ${i / batchSize + 1} (${data?.length || 0} brands)`)
    }

    console.log(`\n✅ Import complete!`)
    console.log(`   - Total brands processed: ${records.length}`)
    console.log(`   - Successfully inserted/updated: ${inserted}`)
    console.log(`   - Skipped: ${records.length - inserted}`)

    // Get some stats
    const { count: totalBrands } = await supabase
      .from('brands')
      .select('*', { count: 'exact', head: true })

    const { data: industryCounts } = await supabase
      .from('brands')
      .select('industry')
      .order('industry')

    const industries = industryCounts?.reduce((acc: any, curr) => {
      acc[curr.industry] = (acc[curr.industry] || 0) + 1
      return acc
    }, {})

    console.log(`\n📊 Database Stats:`)
    console.log(`   - Total brands in database: ${totalBrands}`)
    console.log(`   - Industries:`, industries)

  } catch (error) {
    console.error('Seed script failed:', error)
    process.exit(1)
  }
}

// Run the script
seedBrands().then(() => {
  console.log('\n🎉 Brand seeding complete!')
  process.exit(0)
})