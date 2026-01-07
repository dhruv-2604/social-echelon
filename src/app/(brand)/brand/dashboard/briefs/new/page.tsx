'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WellnessButton } from '@/components/wellness/WellnessButton'
import { WellnessCard } from '@/components/wellness/WellnessCard'
import { WellnessInput } from '@/components/wellness/WellnessInput'
import {
  ChevronRight,
  ChevronLeft,
  FileText,
  Package,
  Target,
  DollarSign,
  Calendar,
  Check,
  Loader2,
  AlertCircle,
  ArrowLeft
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface BriefFormData {
  // Step 1: Campaign Details
  title: string
  description: string
  campaign_type: string[]

  // Step 2: Product Info
  product_name: string
  product_description: string
  product_url: string

  // Step 3: Target Creators
  target_niches: string[]
  min_followers: string
  max_followers: string
  min_engagement_rate: string

  // Step 4: Budget & Timeline
  budget_min: string
  budget_max: string
  deadline: string
  content_deadline: string
}

const CAMPAIGN_TYPES = [
  { id: 'post', label: 'Feed Post', description: 'Static image or carousel' },
  { id: 'story', label: 'Story', description: '24-hour content' },
  { id: 'reel', label: 'Reel', description: 'Short-form video' },
  { id: 'ugc', label: 'UGC', description: 'User-generated content' },
  { id: 'review', label: 'Review', description: 'Product review' },
  { id: 'unboxing', label: 'Unboxing', description: 'Unboxing experience' }
]

const NICHES = [
  'Wellness', 'Fitness', 'Beauty', 'Fashion', 'Food & Cooking',
  'Travel', 'Lifestyle', 'Parenting', 'Tech', 'Finance',
  'Education', 'Entertainment', 'Gaming', 'Home & DIY', 'Sustainability'
]

const FOLLOWER_RANGES = [
  { min: 1000, max: 10000, label: '1K - 10K (Nano)' },
  { min: 10000, max: 50000, label: '10K - 50K (Micro)' },
  { min: 50000, max: 100000, label: '50K - 100K (Mid-tier)' },
  { min: 100000, max: 500000, label: '100K - 500K (Macro)' },
  { min: 500000, max: 0, label: '500K+ (Top creators)' }
]

export default function CreateBriefPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<BriefFormData>({
    title: '',
    description: '',
    campaign_type: [],
    product_name: '',
    product_description: '',
    product_url: '',
    target_niches: [],
    min_followers: '',
    max_followers: '',
    min_engagement_rate: '',
    budget_min: '',
    budget_max: '',
    deadline: '',
    content_deadline: ''
  })

  const totalSteps = 4

  const validateStep = (step: number): string | null => {
    switch (step) {
      case 1:
        if (!formData.title.trim()) return 'Please enter a campaign title'
        if (!formData.description.trim()) return 'Please enter a campaign description'
        if (formData.description.length < 10) return 'Description must be at least 10 characters'
        if (formData.campaign_type.length === 0) return 'Please select at least one campaign type'
        break
      case 2:
        // Product info is optional
        break
      case 3:
        // Target creators is optional
        break
      case 4:
        if (!formData.budget_min && !formData.budget_max) {
          return 'Please enter at least a minimum or maximum budget'
        }
        break
    }
    return null
  }

  const handleNext = () => {
    setError(null)
    const validationError = validateStep(currentStep)
    if (validationError) {
      setError(validationError)
      return
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    setError(null)
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/brand/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          campaign_type: formData.campaign_type,
          product_name: formData.product_name || undefined,
          product_description: formData.product_description || undefined,
          product_url: formData.product_url || undefined,
          target_niches: formData.target_niches.length > 0 ? formData.target_niches : undefined,
          min_followers: formData.min_followers ? parseInt(formData.min_followers) : undefined,
          max_followers: formData.max_followers ? parseInt(formData.max_followers) : undefined,
          min_engagement_rate: formData.min_engagement_rate ? parseFloat(formData.min_engagement_rate) : undefined,
          budget_min: formData.budget_min ? parseInt(formData.budget_min) : undefined,
          budget_max: formData.budget_max ? parseInt(formData.budget_max) : undefined,
          deadline: formData.deadline || undefined,
          content_deadline: formData.content_deadline || undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create brief')
      }

      router.push('/brand/dashboard/briefs')
    } catch (err) {
      console.error('Error creating brief:', err)
      setError(err instanceof Error ? err.message : 'Failed to create brief')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleArrayValue = (array: string[], value: string): string[] => {
    return array.includes(value)
      ? array.filter(v => v !== value)
      : [...array, value]
  }

  const updateFormData = (field: keyof BriefFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <motion.div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
              step === currentStep
                ? "bg-purple-600 text-white"
                : step < currentStep
                ? "bg-purple-100 text-purple-600"
                : "bg-gray-100 text-gray-400"
            )}
            initial={false}
            animate={{
              scale: step === currentStep ? 1.1 : 1
            }}
          >
            {step < currentStep ? <Check className="w-4 h-4" /> : step}
          </motion.div>
          {step < 4 && (
            <div
              className={cn(
                "w-8 h-0.5 mx-1",
                step < currentStep ? "bg-purple-200" : "bg-gray-200"
              )}
            />
          )}
        </div>
      ))}
    </div>
  )

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-medium text-gray-800">Campaign Details</h2>
                <p className="text-sm text-gray-500">Tell creators about your campaign</p>
              </div>
            </div>

            <WellnessInput
              label="Campaign Title"
              placeholder="e.g., Summer Product Launch"
              value={formData.title}
              onChange={(e) => updateFormData('title', e.target.value)}
              required
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Campaign Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                placeholder="Describe your campaign goals, what you're looking for, and any special requirements..."
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-base
                         focus:outline-none focus:ring-4 focus:border-purple-500 focus:ring-purple-100
                         hover:border-gray-300 transition-all duration-300 resize-none"
                rows={4}
              />
              <p className="text-xs text-gray-500">{formData.description.length}/5000 characters</p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Content Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CAMPAIGN_TYPES.map((type) => (
                  <motion.button
                    key={type.id}
                    type="button"
                    onClick={() => updateFormData('campaign_type', toggleArrayValue(formData.campaign_type, type.id))}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      formData.campaign_type.includes(type.id)
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <p className="font-medium text-gray-800">{type.label}</p>
                    <p className="text-xs text-gray-500">{type.description}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <h2 className="text-xl font-medium text-gray-800">Product Information</h2>
                <p className="text-sm text-gray-500">Optional - Tell creators about your product</p>
              </div>
            </div>

            <WellnessInput
              label="Product Name"
              placeholder="e.g., Organic Face Serum"
              value={formData.product_name}
              onChange={(e) => updateFormData('product_name', e.target.value)}
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Product Description</label>
              <textarea
                value={formData.product_description}
                onChange={(e) => updateFormData('product_description', e.target.value)}
                placeholder="Describe your product, its benefits, and key features..."
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-base
                         focus:outline-none focus:ring-4 focus:border-purple-500 focus:ring-purple-100
                         hover:border-gray-300 transition-all duration-300 resize-none"
                rows={3}
              />
            </div>

            <WellnessInput
              label="Product URL"
              placeholder="https://yourstore.com/product"
              type="url"
              value={formData.product_url}
              onChange={(e) => updateFormData('product_url', e.target.value)}
            />
          </motion.div>
        )

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-medium text-gray-800">Target Creators</h2>
                <p className="text-sm text-gray-500">Optional - Define your ideal creator profile</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Target Niches</label>
              <div className="flex flex-wrap gap-2">
                {NICHES.map((niche) => (
                  <motion.button
                    key={niche}
                    type="button"
                    onClick={() => updateFormData('target_niches', toggleArrayValue(formData.target_niches, niche))}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                      formData.target_niches.includes(niche)
                        ? "bg-purple-100 text-purple-700 border-2 border-purple-300"
                        : "bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200"
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {niche}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Follower Range</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {FOLLOWER_RANGES.map((range) => {
                  const isSelected =
                    formData.min_followers === String(range.min) &&
                    (range.max === 0 ? !formData.max_followers : formData.max_followers === String(range.max))
                  return (
                    <motion.button
                      key={range.label}
                      type="button"
                      onClick={() => {
                        updateFormData('min_followers', String(range.min))
                        updateFormData('max_followers', range.max === 0 ? '' : String(range.max))
                      }}
                      className={cn(
                        "p-3 rounded-xl border-2 text-left transition-all",
                        isSelected
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <p className="font-medium text-gray-800">{range.label}</p>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            <WellnessInput
              label="Minimum Engagement Rate (%)"
              placeholder="e.g., 2.5"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={formData.min_engagement_rate}
              onChange={(e) => updateFormData('min_engagement_rate', e.target.value)}
              helper="Leave empty for no minimum"
            />
          </motion.div>
        )

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-medium text-gray-800">Budget & Timeline</h2>
                <p className="text-sm text-gray-500">Set your campaign budget and deadlines</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <WellnessInput
                label="Minimum Budget ($)"
                placeholder="500"
                type="number"
                min="0"
                value={formData.budget_min}
                onChange={(e) => updateFormData('budget_min', e.target.value)}
                required
              />
              <WellnessInput
                label="Maximum Budget ($)"
                placeholder="2000"
                type="number"
                min="0"
                value={formData.budget_max}
                onChange={(e) => updateFormData('budget_max', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Campaign Deadline
                  </span>
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => updateFormData('deadline', e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-base
                           focus:outline-none focus:ring-4 focus:border-purple-500 focus:ring-purple-100
                           hover:border-gray-300 transition-all duration-300"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Content Due Date
                  </span>
                </label>
                <input
                  type="date"
                  value={formData.content_deadline}
                  onChange={(e) => updateFormData('content_deadline', e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-base
                           focus:outline-none focus:ring-4 focus:border-purple-500 focus:ring-purple-100
                           hover:border-gray-300 transition-all duration-300"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Summary Preview */}
            <WellnessCard className="p-4 bg-purple-50/50">
              <h3 className="font-medium text-gray-800 mb-3">Campaign Summary</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">Title:</span> {formData.title || '-'}</p>
                <p><span className="text-gray-500">Content Types:</span> {formData.campaign_type.join(', ') || '-'}</p>
                <p><span className="text-gray-500">Budget:</span> ${formData.budget_min || '?'} - ${formData.budget_max || '?'}</p>
                <p><span className="text-gray-500">Target Niches:</span> {formData.target_niches.join(', ') || 'All niches'}</p>
              </div>
            </WellnessCard>
          </motion.div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          href="/brand/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <WellnessCard className="p-6 md:p-8">
            <h1 className="text-2xl font-display font-light text-gray-800 mb-2 text-center">
              Create Campaign Brief
            </h1>
            <p className="text-gray-600 text-center mb-6">
              Describe your campaign and we&apos;ll match you with relevant creators
            </p>

            {renderStepIndicator()}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>

            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
              <WellnessButton
                variant="secondary"
                onClick={handleBack}
                disabled={currentStep === 1 || isSubmitting}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </WellnessButton>

              <WellnessButton
                variant="primary"
                onClick={handleNext}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : currentStep === totalSteps ? (
                  <>
                    Create Brief
                    <Check className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </WellnessButton>
            </div>
          </WellnessCard>
        </motion.div>
      </div>
    </div>
  )
}
