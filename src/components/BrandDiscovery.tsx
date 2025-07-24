'use client'

import { useState, useEffect } from 'react'
import { Search, Users, TrendingUp } from 'lucide-react'

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
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Discover New Brands</h2>
          <p className="text-sm text-gray-600 mt-1">
            Brands that creators in your niche have worked with
          </p>
        </div>
        <button
          onClick={discoverBrands}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          {loading ? 'Discovering...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {brands.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No brands discovered yet</p>
          <p className="text-sm mt-1">We need more creators in your niche to find brand patterns</p>
        </div>
      )}

      <div className="space-y-4">
        {brands.map((brand, index) => (
          <div key={index} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex-1">
              <h3 className="font-medium capitalize">{brand.brand_name}</h3>
              <p className="text-sm text-gray-600 mt-1">
                @{brand.instagram_handle}
              </p>
              
              <div className="flex items-center gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    {brand.discovery_metadata.creator_count} creators worked with them
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    {Math.round(brand.confidence_score * 100)}% match
                  </span>
                </div>
              </div>

              {brand.discovery_metadata.found_via_creators.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Creators: {brand.discovery_metadata.found_via_creators.join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}