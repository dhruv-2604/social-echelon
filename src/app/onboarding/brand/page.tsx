'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WellnessButton } from '@/components/wellness/WellnessButton'
import { WellnessCard } from '@/components/wellness/WellnessCard'
import {
  ChevronRight,
  ChevronLeft,
  Building2,
  Target,
  Users,
  Check,
  Loader2,
  AlertCircle,
  DollarSign,
  Sparkles,
  Heart
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BrandOnboardingData {
  // Step 1: Company Details
  company: {
    description: string
    size: string
    socialLinks: {
      instagram: string
      tiktok: string
      twitter: string
    }
  }
  // Step 2: Campaign Preferences
  preferences: {
    campaignTypes: string[]
    budgetRange: string
    targetNiches: string[]
    targetFollowerRange: string
    preferredLocations: string[]
    contentThemes: string[]
  }
}

const CAMPAIGN_TYPES = [
  { id: 'sponsored_post', label: 'Sponsored Posts', icon: '📸' },
  { id: 'story', label: 'Instagram Stories', icon: '📱' },
  { id: 'reel', label: 'Reels / Short Video', icon: '🎬' },
  { id: 'ugc', label: 'UGC Content', icon: '✨' },
  { id: 'ambassador', label: 'Brand Ambassador', icon: '🤝' },
  { id: 'event', label: 'Event Coverage', icon: '🎉' }
]

const BUDGET_RANGES = [
  { id: 'micro', label: '$100 - $500', description: 'Nano/micro creators' },
  { id: 'small', label: '$500 - $2,000', description: 'Growing creators' },
  { id: 'medium', label: '$2,000 - $10,000', description: 'Established creators' },
  { id: 'large', label: '$10,000+', description: 'Top-tier talent' }
]

const NICHES = [
  'Wellness', 'Fitness', 'Beauty', 'Fashion', 'Food & Cooking',
  'Travel', 'Lifestyle', 'Parenting', 'Tech', 'Finance',
  'Education', 'Entertainment', 'Gaming', 'Home & DIY', 'Sustainability'
]

const FOLLOWER_RANGES = [
  { id: '1k-10k', label: '1K - 10K', description: 'Nano influencers' },
  { id: '10k-50k', label: '10K - 50K', description: 'Micro influencers' },
  { id: '50k-100k', label: '50K - 100K', description: 'Mid-tier creators' },
  { id: '100k-500k', label: '100K - 500K', description: 'Macro influencers' },
  { id: '500k+', label: '500K+', description: 'Top creators' }
]

const COMPANY_SIZES = [
  { id: 'solo', label: 'Just me', description: 'Solopreneur' },
  { id: 'small', label: '2-10', description: 'Small team' },
  { id: 'medium', label: '11-50', description: 'Growing company' },
  { id: 'large', label: '51-200', description: 'Established business' },
  { id: 'enterprise', label: '200+', description: 'Enterprise' }
]

export default function BrandOnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [formData, setFormData] = useState<BrandOnboardingData>({
    company: {
      description: '',
      size: '',
      socialLinks: {
        instagram: '',
        tiktok: '',
        twitter: ''
      }
    },
    preferences: {
      campaignTypes: [],
      budgetRange: '',
      targetNiches: [],
      targetFollowerRange: '',
      preferredLocations: [],
      contentThemes: []
    }
  })

  const validateStep = (step: number): string | null => {
    switch (step) {
      case 1:
        if (!formData.company.size) {
          return 'Please select your company size'
        }
        break
      case 2:
        if (formData.preferences.campaignTypes.length === 0) {
          return 'Please select at least one campaign type'
        }
        if (!formData.preferences.budgetRange) {
          return 'Please select a budget range'
        }
        break
    }
    return null
  }

  const handleNext = () => {
    setValidationError(null)
    const error = validateStep(currentStep)
    if (error) {
      setValidationError(error)
      return
    }

    if (currentStep < 2) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    setValidationError(null)
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    const error = validateStep(2)
    if (error) {
      setValidationError(error)
      return
    }

    setIsSubmitting(true)
    setValidationError(null)

    try {
      const response = await fetch('/api/brand/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        router.push('/brand/dashboard')
      } else {
        const data = await response.json()
        setValidationError(data.error || 'Something went wrong. Please try again.')
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error('Error submitting brand onboarding:', error)
      setValidationError('Unable to save your preferences. Please check your connection and try again.')
      setIsSubmitting(false)
    }
  }

  const toggleArrayItem = (field: keyof BrandOnboardingData['preferences'], item: string) => {
    setFormData(prev => {
      const currentArray = prev.preferences[field] as string[]
      const updated = currentArray.includes(item)
        ? currentArray.filter(i => i !== item)
        : [...currentArray, item]

      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          [field]: updated
        }
      }
    })
  }

  const StepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[
          { step: 1, icon: Building2, label: 'Your Company' },
          { step: 2, icon: Target, label: 'Campaign Goals' }
        ].map(({ step, icon: Icon, label }) => (
          <div key={step} className="flex items-center">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: currentStep === step ? 1.1 : 1 }}
              className="relative"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                currentStep >= step
                  ? 'bg-gradient-to-br from-purple-400 to-pink-400 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {currentStep > step ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <Icon className="w-6 h-6" />
                )}
              </div>
              <span className={`absolute -bottom-7 left-1/2 transform -translate-x-1/2 text-sm whitespace-nowrap ${
                currentStep === step ? 'text-purple-600 font-medium' : 'text-gray-400'
              }`}>
                {label}
              </span>
            </motion.div>
            {step < 2 && (
              <div className={`w-16 h-0.5 mx-2 transition-colors ${
                currentStep > step ? 'bg-purple-400' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl font-display font-light text-wellness-neutral-800 mb-3">
            Welcome to Social Echelon
          </h1>
          <p className="text-lg text-wellness-neutral-600">
            {currentStep === 1 && "Tell us about your brand"}
            {currentStep === 2 && "What kind of partnerships are you looking for?"}
          </p>
        </motion.div>

        <StepIndicator />

        <WellnessCard className="p-8 mt-12">
          <AnimatePresence mode="wait">
            {/* Step 1: Company Details */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-medium text-wellness-neutral-800">About Your Brand</h2>
                    <p className="text-sm text-wellness-neutral-600">Help creators understand who you are</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-wellness-neutral-700 mb-2">
                    Company Size
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {COMPANY_SIZES.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => setFormData({
                          ...formData,
                          company: { ...formData.company, size: size.id }
                        })}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          formData.company.size === size.id
                            ? 'border-purple-400 bg-purple-50'
                            : 'border-wellness-neutral-200 hover:border-purple-200'
                        }`}
                      >
                        <div className="font-medium text-wellness-neutral-800">{size.label}</div>
                        <div className="text-xs text-wellness-neutral-500">{size.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-wellness-neutral-700 mb-2">
                    Tell creators about your brand
                  </label>
                  <textarea
                    value={formData.company.description}
                    onChange={(e) => setFormData({
                      ...formData,
                      company: { ...formData.company, description: e.target.value }
                    })}
                    className="w-full p-4 border border-wellness-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-wellness-purple focus:border-transparent text-wellness-neutral-900 bg-white placeholder:text-wellness-neutral-400"
                    rows={4}
                    placeholder="What does your brand stand for? What makes you unique? What kind of partnerships excite you?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-wellness-neutral-700 mb-2">
                    Social Media (Optional)
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-wellness-neutral-500 w-20">Instagram</span>
                      <input
                        type="text"
                        value={formData.company.socialLinks.instagram}
                        onChange={(e) => setFormData({
                          ...formData,
                          company: {
                            ...formData.company,
                            socialLinks: { ...formData.company.socialLinks, instagram: e.target.value }
                          }
                        })}
                        className="flex-1 p-3 border border-wellness-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellness-purple text-wellness-neutral-900 bg-white placeholder:text-wellness-neutral-400"
                        placeholder="@yourbrand"
                      />
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-wellness-neutral-500 w-20">TikTok</span>
                      <input
                        type="text"
                        value={formData.company.socialLinks.tiktok}
                        onChange={(e) => setFormData({
                          ...formData,
                          company: {
                            ...formData.company,
                            socialLinks: { ...formData.company.socialLinks, tiktok: e.target.value }
                          }
                        })}
                        className="flex-1 p-3 border border-wellness-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellness-purple text-wellness-neutral-900 bg-white placeholder:text-wellness-neutral-400"
                        placeholder="@yourbrand"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Campaign Preferences */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center">
                    <Target className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-medium text-wellness-neutral-800">Campaign Preferences</h2>
                    <p className="text-sm text-wellness-neutral-600">What kind of content do you need?</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-wellness-neutral-700 mb-3">
                    Campaign Types You're Interested In
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {CAMPAIGN_TYPES.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => toggleArrayItem('campaignTypes', type.id)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          formData.preferences.campaignTypes.includes(type.id)
                            ? 'border-purple-400 bg-purple-50'
                            : 'border-wellness-neutral-200 hover:border-purple-200'
                        }`}
                      >
                        <div className="text-2xl mb-1">{type.icon}</div>
                        <div className="text-sm font-medium text-wellness-neutral-800">{type.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-wellness-neutral-700 mb-3">
                    Budget Per Campaign
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {BUDGET_RANGES.map((budget) => (
                      <button
                        key={budget.id}
                        onClick={() => setFormData({
                          ...formData,
                          preferences: { ...formData.preferences, budgetRange: budget.id }
                        })}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          formData.preferences.budgetRange === budget.id
                            ? 'border-green-400 bg-green-50'
                            : 'border-wellness-neutral-200 hover:border-green-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-wellness-neutral-800">{budget.label}</span>
                        </div>
                        <div className="text-xs text-wellness-neutral-500">{budget.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-wellness-neutral-700 mb-3">
                    Creator Niches You're Targeting
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {NICHES.map((niche) => (
                      <button
                        key={niche}
                        onClick={() => toggleArrayItem('targetNiches', niche)}
                        className={`px-4 py-2 rounded-full text-sm transition-all ${
                          formData.preferences.targetNiches.includes(niche)
                            ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-white'
                            : 'bg-wellness-neutral-100 text-wellness-neutral-700 hover:bg-wellness-neutral-200'
                        }`}
                      >
                        {niche}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-wellness-neutral-700 mb-3">
                    Preferred Creator Size
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {FOLLOWER_RANGES.map((range) => (
                      <button
                        key={range.id}
                        onClick={() => setFormData({
                          ...formData,
                          preferences: { ...formData.preferences, targetFollowerRange: range.id }
                        })}
                        className={`p-3 rounded-xl border-2 transition-all text-left ${
                          formData.preferences.targetFollowerRange === range.id
                            ? 'border-purple-400 bg-purple-50'
                            : 'border-wellness-neutral-200 hover:border-purple-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-purple-600" />
                          <span className="font-medium text-wellness-neutral-800">{range.label}</span>
                        </div>
                        <div className="text-xs text-wellness-neutral-500">{range.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Success message */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-3 mb-3">
                    <Heart className="w-6 h-6 text-purple-600" />
                    <h3 className="font-medium text-purple-900">You're Almost Ready!</h3>
                  </div>
                  <p className="text-sm text-purple-700">
                    Once you complete setup, you can start creating campaign briefs and we'll
                    match you with creators who are actively looking for partnerships like yours.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Validation Error */}
          <AnimatePresence>
            {validationError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 mt-6"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{validationError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-wellness-neutral-200">
            <WellnessButton
              variant="secondary"
              onClick={handleBack}
              disabled={currentStep === 1 || isSubmitting}
              className={currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''}
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back
            </WellnessButton>

            <WellnessButton
              variant="primary"
              onClick={handleNext}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Setting up...
                </>
              ) : currentStep === 2 ? (
                <>
                  Complete Setup
                  <Sparkles className="w-5 h-5 ml-2" />
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-5 h-5 ml-2" />
                </>
              )}
            </WellnessButton>
          </div>
        </WellnessCard>
      </div>
    </div>
  )
}
