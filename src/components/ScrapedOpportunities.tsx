'use client'

import { useState, useEffect } from 'react'
import { Globe, TrendingUp, DollarSign, Users, Calendar, Mail } from 'lucide-react'
import { WellnessCard } from './wellness/WellnessCard'
import { WellnessButton } from './wellness/WellnessButton'
import { BreathingLoader } from './wellness/BreathingLoader'
import { cn } from '@/lib/utils'

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
        return 'bg-wellness-green-light text-wellness-green border-wellness-green/20'
      case 'campaign_announcement':
        return 'bg-wellness-blue-light text-wellness-blue border-wellness-blue/20'
      case 'budget_announcement':
        return 'bg-wellness-purple-light text-wellness-purple border-wellness-purple/20'
      default:
        return 'bg-wellness-neutral-100 text-wellness-neutral-700 border-wellness-neutral-200'
    }
  }

  if (loading) {
    return (
      <WellnessCard className="min-h-[300px] flex flex-col items-center justify-center">
        <BreathingLoader text="Scanning for aligned opportunities..." size="md" />
      </WellnessCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Scraped Opportunities */}
      <WellnessCard padding="lg">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-display font-bold text-wellness-neutral-900">Discovered Brand Opportunities</h2>
          <span className="px-3 py-1 bg-wellness-purple-light text-wellness-purple text-sm font-medium rounded-full">
            {opportunities.length} qualified matches
          </span>
        </div>

        {opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-wellness-neutral-500">
            <div className="w-16 h-16 bg-wellness-neutral-100 rounded-full flex items-center justify-center mb-4">
              <Globe className="w-8 h-8 text-wellness-neutral-300" />
            </div>
            <p className="font-medium">No opportunities discovered yet</p>
            <p className="text-sm mt-1 text-wellness-neutral-400">The scraper runs daily at 9 AM</p>
          </div>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opp) => (
              <div 
                key={opp.id} 
                className="rounded-2xl p-5 transition-all duration-300 bg-wellness-neutral-100/30 border border-transparent hover:bg-white hover:shadow-wellness-sm hover:border-wellness-purple/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getOpportunityColor(opp.opportunity_type)}`}>
                        {getOpportunityIcon(opp.opportunity_type)}
                        <span className="capitalize">{opp.opportunity_type.replace('_', ' ')}</span>
                      </div>
                      <span className="text-sm text-wellness-neutral-500 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {Math.round((opp.relevance_score || 0) * 100)}% relevant
                      </span>
                    </div>
                    
                    <h3 className="font-display font-bold text-lg text-wellness-neutral-900 mb-1">{opp.title}</h3>
                    <p className="text-sm text-wellness-neutral-600 mb-3">
                      <span className="font-medium text-wellness-purple">{opp.brand_name}</span>
                      {opp.published_date && (
                        <span className="text-wellness-neutral-400"> • Published {new Date(opp.published_date).toLocaleDateString()}</span>
                      )}
                    </p>

                    {opp.description && (
                      <p className="text-sm text-wellness-neutral-600 mb-4 line-clamp-2 leading-relaxed">{opp.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4">
                      {opp.creator_requirements && (
                        <div className="flex items-center gap-3 text-xs text-wellness-neutral-500 bg-wellness-neutral-100 px-3 py-1.5 rounded-lg">
                          {opp.creator_requirements.followers?.min && (
                            <span>Min {opp.creator_requirements.followers.min.toLocaleString()} followers</span>
                          )}
                          {opp.creator_requirements.engagement_rate && (
                            <span>• {opp.creator_requirements.engagement_rate}% engagement</span>
                          )}
                        </div>
                      )}

                      {opp.contact_info && opp.contact_info.email && (
                        <a 
                          href={`mailto:${opp.contact_info.email}`}
                          className="text-xs text-wellness-blue hover:text-wellness-blue-soft flex items-center gap-1.5 px-3 py-1.5 bg-wellness-blue-light/50 rounded-lg transition-colors"
                        >
                          <Mail className="w-3 h-3" />
                          {opp.contact_info.email}
                        </a>
                      )}
                    </div>
                  </div>

                  <WellnessButton
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(opp.url, '_blank')}
                    className="shrink-0 text-wellness-neutral-600 hover:text-wellness-purple"
                  >
                    View Source
                  </WellnessButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </WellnessCard>

      {/* Brand Research Queue */}
      {brandQueue.length > 0 && (
        <WellnessCard padding="md" className="bg-wellness-neutral-100/50">
          <h3 className="font-display font-semibold text-wellness-neutral-900 mb-4 text-lg">Brands Queued for Research</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {brandQueue.map((brand, index) => (
              <div key={brand.id || index} className="bg-white rounded-xl p-3 text-sm border border-wellness-neutral-200 shadow-sm">
                <p className="font-medium capitalize text-wellness-neutral-900">{brand.brand_name}</p>
                <p className="text-xs text-wellness-neutral-500 mt-1 flex items-center gap-1">
                  Priority: 
                  <span className={cn(
                    "font-medium",
                    brand.priority > 7 ? "text-wellness-coral" : "text-wellness-blue"
                  )}>{brand.priority}/10</span>
                </p>
              </div>
            ))}
          </div>
        </WellnessCard>
      )}
    </div>
  )
}