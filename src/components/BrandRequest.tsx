'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Send, Plus, Search } from 'lucide-react'

interface BrandRequestProps {
  onRequestSubmitted?: () => void
}

export default function BrandRequest({ onRequestSubmitted }: BrandRequestProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createSupabaseBrowserClient()
  const [formData, setFormData] = useState({
    brand_name: '',
    brand_instagram: '',
    brand_website: '',
    reason_for_interest: '',
    estimated_budget: '',
    contact_email: ''
  })

  const budgetRanges = [
    'Under $500',
    '$500 - $1,000',
    '$1,000 - $2,500',
    '$2,500 - $5,000',
    '$5,000 - $10,000',
    'Over $10,000',
    'Not sure'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('brand_requests')
        .insert({
          user_id: user.id,
          ...formData,
          contact_found: !!formData.contact_email
        })

      if (error) throw error

      // Reset form
      setFormData({
        brand_name: '',
        brand_instagram: '',
        brand_website: '',
        reason_for_interest: '',
        estimated_budget: '',
        contact_email: ''
      })
      
      setIsOpen(false)
      if (onRequestSubmitted) onRequestSubmitted()
      
      // Show success message
      alert('Brand request submitted! We\'ll research this brand and add it to our database.')
    } catch (error) {
      console.error('Error submitting brand request:', error)
      alert('Failed to submit request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 group"
      >
        <Plus className="w-5 h-5" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
          Request Brand
        </span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Request a Brand</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                Can't find a brand you want to work with? Tell us about it and we'll add it to our database!
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brand_name}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Glossier"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={formData.brand_instagram}
                    onChange={(e) => setFormData({ ...formData, brand_instagram: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="@glossier"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.brand_website}
                    onChange={(e) => setFormData({ ...formData, brand_website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="https://glossier.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Why do you want to work with this brand?
                  </label>
                  <textarea
                    value={formData.reason_for_interest}
                    onChange={(e) => setFormData({ ...formData, reason_for_interest: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                    placeholder="I love their sustainable approach to beauty..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Budget Range
                  </label>
                  <select
                    value={formData.estimated_budget}
                    onChange={(e) => setFormData({ ...formData, estimated_budget: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select budget range</option>
                    {budgetRanges.map(range => (
                      <option key={range} value={range}>{range}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PR Contact Email (if you have it)
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="pr@glossier.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This helps us research the brand faster
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      'Submitting...'
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}