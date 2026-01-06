'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Send, Plus, Search, X, CheckCircle, AlertCircle } from 'lucide-react'
import { WellnessButton } from './wellness/WellnessButton'
import { cn } from '@/lib/utils'

interface BrandRequestProps {
  onRequestSubmitted?: () => void
}

export default function BrandRequest({ onRequestSubmitted }: BrandRequestProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
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

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

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
      setNotification({
        type: 'success',
        message: 'Brand request submitted! We\'ll research this brand and add it to our database.'
      })
    } catch (error) {
      console.error('Error submitting brand request:', error)
      setNotification({
        type: 'error',
        message: 'Failed to submit request. Please try again.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl shadow-wellness-lg border backdrop-blur-sm',
            notification.type === 'success'
              ? 'bg-green-50/95 border-green-200 text-green-800'
              : 'bg-red-50/95 border-red-200 text-red-800'
          )}>
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 p-1 hover:bg-black/5 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-wellness-purple to-wellness-coral text-white rounded-full p-4 shadow-wellness-lg hover:shadow-wellness-xl hover:scale-105 transition-all duration-300 flex items-center gap-2 group z-40"
      >
        <Plus className="w-6 h-6" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-medium pr-0 group-hover:pr-2">
          Request Brand
        </span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-wellness-neutral-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-wellness-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/50">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-display font-bold text-wellness-neutral-900">Request a Brand</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-wellness-neutral-100 rounded-full transition-colors text-wellness-neutral-500 hover:text-wellness-neutral-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-wellness-neutral-600 mb-8 leading-relaxed">
                Can't find a brand you want to work with? Tell us about it and we'll add it to our database!
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-wellness-neutral-700 mb-1.5">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brand_name}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-wellness-neutral-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-wellness-purple focus:border-transparent transition-all"
                    placeholder="e.g., Glossier"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-wellness-neutral-700 mb-1.5">
                    Instagram Handle
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-2.5 text-wellness-neutral-400">@</span>
                    <input
                      type="text"
                      value={formData.brand_instagram}
                      onChange={(e) => setFormData({ ...formData, brand_instagram: e.target.value })}
                      className="w-full pl-8 pr-4 py-2.5 bg-wellness-neutral-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-wellness-purple focus:border-transparent transition-all"
                      placeholder="glossier"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-wellness-neutral-700 mb-1.5">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.brand_website}
                    onChange={(e) => setFormData({ ...formData, brand_website: e.target.value })}
                    className="w-full px-4 py-2.5 bg-wellness-neutral-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-wellness-purple focus:border-transparent transition-all"
                    placeholder="https://glossier.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-wellness-neutral-700 mb-1.5">
                    Why do you want to work with this brand?
                  </label>
                  <textarea
                    value={formData.reason_for_interest}
                    onChange={(e) => setFormData({ ...formData, reason_for_interest: e.target.value })}
                    className="w-full px-4 py-2.5 bg-wellness-neutral-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-wellness-purple focus:border-transparent transition-all resize-none"
                    rows={3}
                    placeholder="I love their sustainable approach to beauty..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-wellness-neutral-700 mb-1.5">
                    Estimated Budget Range
                  </label>
                  <div className="relative">
                    <select
                      value={formData.estimated_budget}
                      onChange={(e) => setFormData({ ...formData, estimated_budget: e.target.value })}
                      className="w-full px-4 py-2.5 bg-wellness-neutral-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-wellness-purple focus:border-transparent transition-all appearance-none"
                    >
                      <option value="">Select budget range</option>
                      {budgetRanges.map(range => (
                        <option key={range} value={range}>{range}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-3 pointer-events-none text-wellness-neutral-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-wellness-neutral-700 mb-1.5">
                    PR Contact Email (if you have it)
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-wellness-neutral-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-wellness-purple focus:border-transparent transition-all"
                    placeholder="pr@glossier.com"
                  />
                  <p className="text-xs text-wellness-neutral-500 mt-1.5">
                    This helps us research the brand faster
                  </p>
                </div>

                <div className="flex gap-3 pt-4 border-t border-wellness-neutral-100 mt-6">
                  <WellnessButton
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </WellnessButton>
                  <WellnessButton
                    variant="primary"
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      'Submitting...'
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Request
                      </>
                    )}
                  </WellnessButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}