'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WellnessCard } from './WellnessCard'
import { WellnessButton } from './WellnessButton'
import { 
  Heart,
  Star,
  Users,
  MapPin,
  DollarSign,
  Send,
  Sparkles,
  Filter,
  Search,
  TrendingUp,
  Award,
  Flower2,
  TreePine,
  Leaf
} from 'lucide-react'

interface Brand {
  id: string
  name: string
  category: string
  values: string[]
  location: string
  audienceMatch: number
  valueAlignment: number
  estimatedRate: string
  status: 'perfect' | 'growing' | 'seedling'
  logo?: string
  recentCampaigns?: string
}

interface PartnershipGardenProps {
  brands?: Brand[]
  onExpressInterest?: (brandId: string) => void
  onRequestBrand?: () => void
}

export function PartnershipGarden({ 
  brands = mockBrands,
  onExpressInterest,
  onRequestBrand
}: PartnershipGardenProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'perfect' | 'growing' | 'seedling'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'garden' | 'list'>('garden')

  const filteredBrands = brands.filter(brand => {
    const matchesFilter = selectedFilter === 'all' || brand.status === selectedFilter
    const matchesSearch = brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          brand.category.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'perfect': return <Flower2 className="w-5 h-5 text-pink-500" />
      case 'growing': return <TreePine className="w-5 h-5 text-green-500" />
      case 'seedling': return <Leaf className="w-5 h-5 text-green-400" />
      default: return <Sparkles className="w-5 h-5 text-purple-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'perfect': return 'from-pink-50 to-purple-50 border-pink-200'
      case 'growing': return 'from-green-50 to-blue-50 border-green-200'
      case 'seedling': return 'from-yellow-50 to-green-50 border-yellow-200'
      default: return 'from-gray-50 to-gray-100'
    }
  }

  const getMatchQuality = (audience: number, values: number) => {
    const total = (audience + values) / 2
    if (total >= 80) return { label: 'Perfect Match', color: 'text-green-600' }
    if (total >= 60) return { label: 'Good Fit', color: 'text-blue-600' }
    return { label: 'Worth Exploring', color: 'text-purple-600' }
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-light text-gray-800 mb-2">
            Your Partnership Garden
          </h1>
          <p className="text-gray-600 text-lg">
            Cultivate authentic relationships that grow naturally
          </p>
        </motion.div>

        {/* Garden Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <WellnessCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Full Bloom</p>
                <p className="text-2xl font-light text-pink-600">
                  {brands.filter(b => b.status === 'perfect').length}
                </p>
              </div>
              <Flower2 className="w-8 h-8 text-pink-300" />
            </div>
          </WellnessCard>

          <WellnessCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Growing Strong</p>
                <p className="text-2xl font-light text-green-600">
                  {brands.filter(b => b.status === 'growing').length}
                </p>
              </div>
              <TreePine className="w-8 h-8 text-green-300" />
            </div>
          </WellnessCard>

          <WellnessCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">New Seedlings</p>
                <p className="text-2xl font-light text-yellow-600">
                  {brands.filter(b => b.status === 'seedling').length}
                </p>
              </div>
              <Leaf className="w-8 h-8 text-yellow-300" />
            </div>
          </WellnessCard>

          <WellnessCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg. Match</p>
                <p className="text-2xl font-light text-purple-600">
                  {Math.round(brands.reduce((acc, b) => acc + b.audienceMatch, 0) / brands.length)}%
                </p>
              </div>
              <Heart className="w-8 h-8 text-purple-300" />
            </div>
          </WellnessCard>
        </div>

        {/* Filters and Search */}
        <WellnessCard className="mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by brand or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2">
              {(['all', 'perfect', 'growing', 'seedling'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    selectedFilter === filter
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('garden')}
                className={`p-2 rounded-lg ${
                  viewMode === 'garden' ? 'bg-purple-100 text-purple-700' : 'text-gray-500'
                }`}
              >
                <Sparkles className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${
                  viewMode === 'list' ? 'bg-purple-100 text-purple-700' : 'text-gray-500'
                }`}
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>
        </WellnessCard>

        {/* Brand Cards */}
        <AnimatePresence mode="wait">
          {viewMode === 'garden' ? (
            <motion.div
              key="garden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredBrands.map((brand, index) => (
                <BrandCard
                  key={brand.id}
                  brand={brand}
                  onExpressInterest={() => onExpressInterest?.(brand.id)}
                  delay={index * 0.05}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {filteredBrands.map((brand, index) => (
                <BrandListItem
                  key={brand.id}
                  brand={brand}
                  onExpressInterest={() => onExpressInterest?.(brand.id)}
                  delay={index * 0.05}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-600 mb-4">
            Your AI found {brands.length} partnerships that align with your values
          </p>
          <WellnessButton
            variant="secondary"
            size="lg"
            onClick={onRequestBrand}
          >
            <Search className="w-4 h-4 mr-2" />
            Request Specific Brand
          </WellnessButton>
        </motion.div>
      </div>
    </div>
  )
}

function BrandCard({ brand, onExpressInterest, delay }: any) {
  const matchQuality = getMatchQuality(brand.audienceMatch, brand.valueAlignment)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <WellnessCard 
        hover 
        className={`h-full bg-gradient-to-br ${getStatusColor(brand.status)}`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {getStatusIcon(brand.status)}
            <div>
              <h3 className="font-medium text-gray-800">{brand.name}</h3>
              <p className="text-sm text-gray-500">{brand.category}</p>
            </div>
          </div>
        </div>

        {/* Match Scores */}
        <div className="space-y-3 mb-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Audience Match</span>
              <span className="text-gray-800">{brand.audienceMatch}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${brand.audienceMatch}%` }}
                transition={{ delay: delay + 0.3, duration: 0.5 }}
                className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Value Alignment</span>
              <span className="text-gray-800">{brand.valueAlignment}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${brand.valueAlignment}%` }}
                transition={{ delay: delay + 0.4, duration: 0.5 }}
                className="h-full bg-gradient-to-r from-blue-400 to-green-400 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="flex flex-wrap gap-1 mb-4">
          {brand.values.slice(0, 3).map((value: string) => (
            <span key={value} className="text-xs px-2 py-1 bg-white/50 text-gray-700 rounded-full">
              {value}
            </span>
          ))}
        </div>

        {/* Location & Rate */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            {brand.location}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <DollarSign className="w-4 h-4" />
            {brand.estimatedRate}
          </div>
        </div>

        {/* Match Quality */}
        <div className={`text-center py-2 px-3 bg-white/50 rounded-lg mb-4 ${matchQuality.color}`}>
          <p className="text-sm font-medium">{matchQuality.label}</p>
        </div>

        {/* Action */}
        <WellnessButton
          variant="calm"
          size="sm"
          className="w-full"
          onClick={onExpressInterest}
        >
          <Send className="w-4 h-4 mr-2" />
          Express Interest
        </WellnessButton>
      </WellnessCard>
    </motion.div>
  )
}

function BrandListItem({ brand, onExpressInterest, delay }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
    >
      <WellnessCard hover>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getStatusIcon(brand.status)}
            <div>
              <h3 className="font-medium text-gray-800">{brand.name}</h3>
              <p className="text-sm text-gray-500">{brand.category} • {brand.location}</p>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-purple-600">Audience: {brand.audienceMatch}%</span>
              <span className="text-blue-600">Values: {brand.valueAlignment}%</span>
            </div>
          </div>
          <WellnessButton
            variant="calm"
            size="sm"
            onClick={onExpressInterest}
          >
            Express Interest
          </WellnessButton>
        </div>
      </WellnessCard>
    </motion.div>
  )
}

function getStatusColor(status: string) {
  switch (status) {
    case 'perfect': return 'from-pink-50 to-purple-50'
    case 'growing': return 'from-green-50 to-blue-50'
    case 'seedling': return 'from-yellow-50 to-green-50'
    default: return 'from-gray-50 to-gray-100'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'perfect': return <Flower2 className="w-5 h-5 text-pink-500" />
    case 'growing': return <TreePine className="w-5 h-5 text-green-500" />
    case 'seedling': return <Leaf className="w-5 h-5 text-green-400" />
    default: return <Sparkles className="w-5 h-5 text-purple-500" />
  }
}

function getMatchQuality(audience: number, values: number) {
  const total = (audience + values) / 2
  if (total >= 80) return { label: 'Perfect Match', color: 'text-green-600' }
  if (total >= 60) return { label: 'Good Fit', color: 'text-blue-600' }
  return { label: 'Worth Exploring', color: 'text-purple-600' }
}

// Mock data
const mockBrands: Brand[] = [
  {
    id: '1',
    name: 'Mindful Mornings',
    category: 'Wellness',
    values: ['Sustainability', 'Mental Health', 'Community'],
    location: 'Los Angeles, CA',
    audienceMatch: 92,
    valueAlignment: 88,
    estimatedRate: '$500-800',
    status: 'perfect'
  },
  {
    id: '2',
    name: 'EcoGlow Beauty',
    category: 'Beauty',
    values: ['Cruelty-Free', 'Organic', 'Inclusive'],
    location: 'New York, NY',
    audienceMatch: 78,
    valueAlignment: 82,
    estimatedRate: '$300-500',
    status: 'growing'
  },
  {
    id: '3',
    name: 'Urban Yoga Co',
    category: 'Fitness',
    values: ['Mindfulness', 'Accessibility', 'Balance'],
    location: 'Austin, TX',
    audienceMatch: 65,
    valueAlignment: 70,
    estimatedRate: '$200-400',
    status: 'seedling'
  }
]