'use client'

import { useState, useEffect } from 'react'
import { Search, Users, TrendingUp } from 'lucide-react'
import { WellnessCard } from './wellness/WellnessCard'
import { WellnessButton } from './wellness/WellnessButton'
import { cn } from '@/lib/utils'

interface DiscoveredBrand {
  brand_name: string
  instagram_handle: string
  confidence_score: number
  discovery_metadata: {
    creator_count: number
    found_via_creators: string[]
    niche_relevance: string
  }
}

export default function BrandDiscovery() {
  const [loading, setLoading] = useState(false)
  const [brands, setBrands] = useState<DiscoveredBrand[]>([])
  const [error, setError] = useState<string | null>(null)

  const discoverBrands = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/brand-discovery/niche-peers')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to discover brands')
      }
      
      setBrands(data.discovered_brands || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    discoverBrands()
  }, [])

  return (
    <WellnessCard className="h-full flex flex-col" padding="lg">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-display font-bold text-wellness-neutral-900">Discover New Brands</h2>
          <p className="text-sm text-wellness-neutral-500 mt-1">
            Brands that creators in your niche have worked with
          </p>
        </div>
        <WellnessButton
          onClick={discoverBrands}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          {loading ? 'Discovering...' : 'Refresh'}
        </WellnessButton>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-wellness-coral-light border border-wellness-coral rounded-xl text-wellness-coral-soft font-medium">
          {error}
        </div>
      )}

      {brands.length === 0 && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-wellness-neutral-500">
          <div className="w-16 h-16 bg-wellness-neutral-100 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-wellness-neutral-300" />
          </div>
          <p className="font-medium">No brands discovered yet</p>
          <p className="text-sm mt-1 text-wellness-neutral-400">We need more creators in your niche to find brand patterns</p>
        </div>
      )}

      <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
        {brands.map((brand, index) => (
          <div 
            key={index} 
            className={cn(
              "rounded-2xl p-5 transition-all duration-300",
              "bg-wellness-neutral-100/30 border border-transparent",
              "hover:bg-white hover:shadow-wellness-sm hover:border-wellness-blue/30"
            )}
          >
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-bold text-lg capitalize text-wellness-neutral-900">{brand.brand_name}</h3>
                <span className="text-sm font-medium text-wellness-blue bg-wellness-blue-light px-2.5 py-1 rounded-full">
                  @{brand.instagram_handle}
                </span>
              </div>
              
              <div className="flex items-center gap-6 mt-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-wellness-purple-light rounded-lg">
                    <Users className="w-4 h-4 text-wellness-purple" />
                  </div>
                  <span className="text-wellness-neutral-600">
                    <span className="font-semibold text-wellness-neutral-900">{brand.discovery_metadata.creator_count}</span> creators
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-wellness-green-light rounded-lg">
                    <TrendingUp className="w-4 h-4 text-wellness-green" />
                  </div>
                  <span className="text-wellness-neutral-600">
                    <span className="font-semibold text-wellness-neutral-900">{Math.round(brand.confidence_score * 100)}%</span> match
                  </span>
                </div>
              </div>

              {brand.discovery_metadata.found_via_creators.length > 0 && (
                <div className="mt-3 pl-3 border-l-2 border-wellness-neutral-200">
                  <p className="text-xs text-wellness-neutral-400">
                    Found via: {brand.discovery_metadata.found_via_creators.slice(0, 3).join(', ')}
                    {brand.discovery_metadata.found_via_creators.length > 3 && '...'}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </WellnessCard>
  )
}