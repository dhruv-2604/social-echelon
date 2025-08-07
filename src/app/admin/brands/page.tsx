'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Upload, Download, Plus, Search, Filter } from 'lucide-react'

interface Brand {
  id: string
  brand_name: string
  display_name: string
  instagram_handle: string
  website_url: string
  industry: string
  works_with_influencers: boolean
  response_rate: number
  total_outreach_sent: number
  verification_status: string
}

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterIndustry, setFilterIndustry] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkImportData, setBulkImportData] = useState('')
  const supabase = createSupabaseBrowserClient()

  const industries = [
    'Fashion', 'Beauty', 'Fitness', 'Food & Beverage', 'Technology',
    'Travel', 'Home & Living', 'Health & Wellness', 'Entertainment',
    'Education', 'Finance', 'Automotive', 'Other'
  ]

  useEffect(() => {
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setBrands(data as Brand[])
  }

  const handleBulkImport = async () => {
    try {
      // Parse CSV or JSON data
      const lines = bulkImportData.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim())
      
      const brandsToImport = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const brand: any = {}
        
        headers.forEach((header, index) => {
          if (header === 'ships_to_countries' || header === 'preferred_creator_size') {
            // Handle array fields
            brand[header] = values[index] ? values[index].split('|') : []
          } else if (header === 'typical_budget_range') {
            // Handle JSON fields
            const [min, max] = values[index].split('-').map(v => parseInt(v) || 0)
            brand[header] = { min, max }
          } else {
            brand[header] = values[index]
          }
        })
        
        // Set defaults
        brand.discovery_source = 'manual'
        brand.verification_status = 'unverified'
        
        return brand
      })

      // Insert in batches of 50
      for (let i = 0; i < brandsToImport.length; i += 50) {
        const batch = brandsToImport.slice(i, i + 50)
        const { error } = await supabase.from('brands').insert(batch)
        if (error) console.error('Batch import error:', error)
      }

      setBulkImportData('')
      setShowBulkImport(false)
      fetchBrands()
      alert(`Successfully imported ${brandsToImport.length} brands!`)
    } catch (error) {
      console.error('Import error:', error)
      alert('Import failed. Please check your data format.')
    }
  }

  const downloadTemplate = () => {
    const template = `brand_name,display_name,instagram_handle,website_url,industry,headquarters_country,ships_to_countries,preferred_creator_size,typical_budget_range,pr_email
Glossier,Glossier,glossier,https://glossier.com,Beauty,USA,USA|UK|CA,micro|macro,1000-5000,pr@glossier.com
Patagonia,Patagonia,patagonia,https://patagonia.com,Fashion,USA,USA|UK|EU,micro|macro|mega,2000-10000,influencer@patagonia.com`
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'brand_import_template.csv'
    a.click()
  }

  const filteredBrands = brands.filter(brand => {
    const matchesSearch = brand.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         brand.instagram_handle?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesIndustry = filterIndustry === 'all' || brand.industry === filterIndustry
    return matchesSearch && matchesIndustry
  })

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Brand Database Management</h1>
        <p className="text-gray-600">Manage and import brands for creator matching</p>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search brands..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={filterIndustry}
              onChange={(e) => setFilterIndustry(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Industries</option>
              {industries.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Template
            </button>
            <button
              onClick={() => setShowBulkImport(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Bulk Import
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Brand
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600">Total Brands</p>
          <p className="text-2xl font-bold">{brands.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600">Verified</p>
          <p className="text-2xl font-bold">
            {brands.filter(b => b.verification_status === 'verified').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600">Avg Response Rate</p>
          <p className="text-2xl font-bold">
            {brands.length > 0 
              ? (brands.reduce((sum, b) => sum + (b.response_rate || 0), 0) / brands.length).toFixed(1)
              : 0}%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600">Total Outreach</p>
          <p className="text-2xl font-bold">
            {brands.reduce((sum, b) => sum + (b.total_outreach_sent || 0), 0)}
          </p>
        </div>
      </div>

      {/* Brands Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Brand
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Industry
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Response Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredBrands.map(brand => (
              <tr key={brand.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{brand.display_name}</div>
                    <div className="text-sm text-gray-500">@{brand.instagram_handle}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {brand.industry}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {brand.response_rate?.toFixed(1) || 0}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {brand.total_outreach_sent || 0} sent
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    brand.verification_status === 'verified' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {brand.verification_status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-purple-600 hover:text-purple-900 mr-3">
                    Edit
                  </button>
                  <button className="text-red-600 hover:text-red-900">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Bulk Import Brands</h2>
                <button
                  onClick={() => setShowBulkImport(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Paste your CSV data below. Use the template for correct formatting.
                </p>
                <p className="text-xs text-gray-500">
                  Format: brand_name, display_name, instagram_handle, website_url, industry, etc.
                </p>
              </div>

              <textarea
                value={bulkImportData}
                onChange={(e) => setBulkImportData(e.target.value)}
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                placeholder="brand_name,display_name,instagram_handle,website_url,industry,headquarters_country,ships_to_countries,preferred_creator_size,typical_budget_range,pr_email
Glossier,Glossier,glossier,https://glossier.com,Beauty,USA,USA|UK|CA,micro|macro,1000-5000,pr@glossier.com"
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowBulkImport(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkImport}
                  disabled={!bulkImportData.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  Import Brands
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}