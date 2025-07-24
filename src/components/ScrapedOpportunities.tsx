'use client'

import { useState, useEffect } from 'react'
import { Globe, TrendingUp, DollarSign, Users, Calendar, Mail } from 'lucide-react'

interface ScrapedOpportunity {
  id: string
  opportunity_type: string
  brand_name: string
  title: string
  description?: string
  url: string
  relevance_score: number
  creator_requirements?: any
  contact_info?: any
  published_date?: string
  deadline?: string
  status: string
}

export default function ScrapedOpportunities() {
  const [opportunities, setOpportunities] = useState<ScrapedOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [brandQueue, setBrandQueue] = useState<any[]>([])

  useEffect(() => {
    fetchOpportunities()
  }, [])

  const fetchOpportunities = async () => {
    try {
      const response = await fetch('/api/brand-discovery/scrape')
      const data = await response.json()
      
      if (response.ok) {
        setOpportunities(data.opportunities || [])
        setBrandQueue(data.brand_queue || [])
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error)
    } finally {
      setLoading(false)
    }
  }

  const getOpportunityIcon = (type: string) => {
    switch (type) {
      case 'campaign_announcement':
        return <TrendingUp className="w-5 h-5" />
      case 'budget_announcement':
        return <DollarSign className="w-5 h-5" />
      case 'program_launch':
        return <Users className="w-5 h-5" />
      case 'product_launch':
        return <Globe className="w-5 h-5" />
      default:
        return <Calendar className="w-5 h-5" />
    }
  }

  const getOpportunityColor = (type: string) => {
    switch (type) {
      case 'open_application':
        return 'bg-green-100 text-green-800'
      case 'campaign_announcement':
        return 'bg-blue-100 text-blue-800'
      case 'budget_announcement':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Scraped Opportunities */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Discovered Brand Opportunities</h2>
          <span className="text-sm text-gray-600">
            {opportunities.length} qualified opportunities
          </span>
        </div>

        {opportunities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No opportunities discovered yet</p>
            <p className="text-sm mt-1">The scraper runs daily at 9 AM</p>
          </div>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opp) => (
              <div key={opp.id} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getOpportunityColor(opp.opportunity_type)}`}>
                        {getOpportunityIcon(opp.opportunity_type)}
                        <span className="capitalize">{opp.opportunity_type.replace('_', ' ')}</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {Math.round((opp.relevance_score || 0) * 100)}% relevant
                      </span>
                    </div>
                    
                    <h3 className="font-medium text-lg">{opp.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">{opp.brand_name}</span>
                      {opp.published_date && (
                        <span> • Published {new Date(opp.published_date).toLocaleDateString()}</span>
                      )}
                    </p>

                    {opp.description && (
                      <p className="text-sm text-gray-700 mt-2 line-clamp-2">{opp.description}</p>
                    )}

                    {opp.creator_requirements && (
                      <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                        {opp.creator_requirements.followers?.min && (
                          <span>Min {opp.creator_requirements.followers.min.toLocaleString()} followers</span>
                        )}
                        {opp.creator_requirements.engagement_rate && (
                          <span>{opp.creator_requirements.engagement_rate}% engagement</span>
                        )}
                      </div>
                    )}

                    {opp.contact_info && (
                      <div className="mt-3 flex items-center gap-4">
                        {opp.contact_info.email && (
                          <a 
                            href={`mailto:${opp.contact_info.email}`}
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Mail className="w-4 h-4" />
                            {opp.contact_info.email}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <a
                    href={opp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    View Source
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Brand Research Queue */}
      {brandQueue.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Brands Queued for Research</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {brandQueue.map((brand, index) => (
              <div key={brand.id || index} className="border rounded-lg p-3 text-sm">
                <p className="font-medium capitalize">{brand.brand_name}</p>
                <p className="text-xs text-gray-600 mt-1">Priority: {brand.priority}/10</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}