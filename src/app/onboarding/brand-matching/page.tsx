'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronRight, ChevronLeft, Instagram, Target, DollarSign, 
  Heart, Check, Info, Flower2, Sparkles, TreePine, Leaf,
  Sun, Moon, Coffee, Smile
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface OnboardingData {
  // Step 1: Analytics
  analytics: {
    engagementRate: string;
    avgLikes: string;
    avgComments: string;
    followerCount: string;
    growthRate: string;
    topLocations: { city: string; country: string; percentage: string }[];
    ageRanges: { range: string; percentage: string }[];
    genderSplit: { male: string; female: string; other: string };
  };
  // Step 2: Identity
  identity: {
    contentPillars: string[];
    brandValues: string[];
    pastBrands: string[];
    dreamBrands: string[];
    blacklistIndustries: string[];
    aestheticKeywords: string[];
    audienceProblems: string[];
    audienceAspirations: string[];
    incomeLevel: string;
  };
  // Step 3: Professional
  professional: {
    monthlyGoal: string;
    hoursPerWeek: string;
    equipment: string[];
    skills: string[];
    languages: string[];
    travelRadius: string;
  };
  // Step 4: Wellbeing
  wellbeing: {
    stressTriggers: string[];
    communicationPreference: string;
    maxBrandsPerMonth: string;
    preferredWorkHours: string;
  };
}

const BRAND_VALUES = [
  'Sustainability', 'Diversity', 'Innovation', 'Luxury', 'Affordability',
  'Wellness', 'Authenticity', 'Quality', 'Community', 'Creativity',
  'Transparency', 'Empowerment', 'Minimalism', 'Adventure', 'Education'
];

const AESTHETIC_KEYWORDS = [
  'Minimalist', 'Colorful', 'Moody', 'Bright', 'Natural',
  'Urban', 'Vintage', 'Modern', 'Bohemian', 'Luxury',
  'Cozy', 'Bold', 'Elegant', 'Playful', 'Professional'
];

const WELLNESS_TRIGGERS = [
  'Last-minute requests', 'Payment delays', 'Rushed deadlines', 'Multiple revisions',
  'Unclear expectations', 'Long approval times', 'Exclusive contracts',
  'Performance pressure', 'Creative restrictions', 'Poor communication'
];

export default function BrandMatchingOnboarding() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<OnboardingData>({
    analytics: {
      engagementRate: '',
      avgLikes: '',
      avgComments: '',
      followerCount: '',
      growthRate: '',
      topLocations: [{ city: '', country: '', percentage: '' }],
      ageRanges: [{ range: '18-24', percentage: '' }, { range: '25-34', percentage: '' }],
      genderSplit: { male: '', female: '', other: '' }
    },
    identity: {
      contentPillars: [],
      brandValues: [],
      pastBrands: [],
      dreamBrands: [],
      blacklistIndustries: [],
      aestheticKeywords: [],
      audienceProblems: [],
      audienceAspirations: [],
      incomeLevel: 'medium'
    },
    professional: {
      monthlyGoal: '',
      hoursPerWeek: '',
      equipment: [],
      skills: [],
      languages: ['English'],
      travelRadius: '50'
    },
    wellbeing: {
      stressTriggers: [],
      communicationPreference: 'email',
      maxBrandsPerMonth: '3',
      preferredWorkHours: 'Flexible'
    }
  })

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/onboarding/brand-matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        router.push('/dashboard/brand-opportunities')
      }
    } catch (error) {
      console.error('Error submitting onboarding:', error)
    }
  }

  const toggleArrayItem = (category: string, item: string) => {
    setFormData(prev => {
      const categoryData = prev.identity[category as keyof typeof prev.identity] as string[]
      const updated = categoryData.includes(item)
        ? categoryData.filter(i => i !== item)
        : [...categoryData, item]
      
      return {
        ...prev,
        identity: {
          ...prev.identity,
          [category]: updated
        }
      }
    })
  }

  const StepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-2">
        {[
          { step: 1, icon: Sparkles, label: 'Your Audience' },
          { step: 2, icon: Heart, label: 'Your Values' },
          { step: 3, icon: TreePine, label: 'Your Goals' },
          { step: 4, icon: Sun, label: 'Your Balance' }
        ].map(({ step, icon: Icon, label }) => (
          <div key={step} className="flex items-center">
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: currentStep === step ? 1.1 : 1 }}
              className={`relative`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                currentStep >= step 
                  ? 'bg-gradient-to-br from-purple-400 to-pink-400 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {currentStep > step ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span className={`absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs whitespace-nowrap ${
                currentStep === step ? 'text-purple-600 font-medium' : 'text-gray-400'
              }`}>
                {label}
              </span>
            </motion.div>
            {step < 4 && (
              <div className={`w-12 h-0.5 mx-1 transition-colors ${
                currentStep > step ? 'bg-purple-400' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl font-light text-gray-900 mb-3">
            Let's Grow Your Partnership Garden 🌱
          </h1>
          <p className="text-lg text-gray-600">
            {currentStep === 1 && "Tell us about your beautiful community"}
            {currentStep === 2 && "Share what makes your content special"}
            {currentStep === 3 && "Dream about your creative future"}
            {currentStep === 4 && "Protect your peace and energy"}
          </p>
        </motion.div>

        <StepIndicator />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 p-8 mt-12"
        >
          <AnimatePresence mode="wait">
            {/* Step 1: Analytics - Your Community */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center">
                    <Instagram className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-light text-gray-900">Your Beautiful Community</h2>
                    <p className="text-sm text-gray-600">Every audience is unique and valuable</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl mb-6">
                  <p className="text-sm text-purple-700">
                    💜 We celebrate communities of all sizes! Whether you have 500 or 50,000 followers, 
                    what matters is the genuine connection you've built with them.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Average Story Views
                    </label>
                    <input
                      type="number"
                      value={formData.analytics.avgLikes}
                      onChange={(e) => setFormData({
                        ...formData,
                        analytics: { ...formData.analytics, avgLikes: e.target.value }
                      })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                      placeholder="It's okay to estimate"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Growth (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.analytics.growthRate}
                      onChange={(e) => setFormData({
                        ...formData,
                        analytics: { ...formData.analytics, growthRate: e.target.value }
                      })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                      placeholder="Slow growth is still growth!"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Age Groups in Your Community</h3>
                  <p className="text-sm text-gray-600 mb-3">Approximate percentages are perfect</p>
                  <div className="space-y-2">
                    {formData.analytics.ageRanges.map((range, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <span className="w-20 text-sm text-gray-600">{range.range}</span>
                        <input
                          type="number"
                          value={range.percentage}
                          onChange={(e) => {
                            const updated = [...formData.analytics.ageRanges]
                            updated[index].percentage = e.target.value
                            setFormData({
                              ...formData,
                              analytics: { ...formData.analytics, ageRanges: updated }
                            })
                          }}
                          className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-300"
                          placeholder="Percentage"
                        />
                        <span className="text-gray-500">%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">Where Your Community Lives</h3>
                      <p className="text-sm text-gray-600">This helps find local partnerships</p>
                    </div>
                    <div className="group relative">
                      <Info className="w-5 h-5 text-purple-400 cursor-help" />
                      <div className="absolute right-0 top-6 w-72 p-3 bg-purple-900 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <p className="mb-2">🌟 <strong>Local partnerships bloom naturally!</strong></p>
                        <p className="text-purple-200">If many followers are in NYC, we'll find cozy cafes and boutiques there. Leave city blank for broader opportunities.</p>
                        <div className="absolute -top-1 right-2 w-2 h-2 bg-purple-900 transform rotate-45"></div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {formData.analytics.topLocations.map((location, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={location.city}
                          onChange={(e) => {
                            const updated = [...formData.analytics.topLocations]
                            updated[index].city = e.target.value
                            setFormData({
                              ...formData,
                              analytics: { ...formData.analytics, topLocations: updated }
                            })
                          }}
                          className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-300"
                          placeholder="City (optional)"
                        />
                        <input
                          type="text"
                          value={location.country}
                          onChange={(e) => {
                            const updated = [...formData.analytics.topLocations]
                            updated[index].country = e.target.value
                            setFormData({
                              ...formData,
                              analytics: { ...formData.analytics, topLocations: updated }
                            })
                          }}
                          className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-300"
                          placeholder="Country"
                        />
                        <input
                          type="number"
                          value={location.percentage}
                          onChange={(e) => {
                            const updated = [...formData.analytics.topLocations]
                            updated[index].percentage = e.target.value
                            setFormData({
                              ...formData,
                              analytics: { ...formData.analytics, topLocations: updated }
                            })
                          }}
                          className="w-20 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-300"
                          placeholder="%"
                        />
                      </div>
                    ))}
                    {formData.analytics.topLocations.length < 5 && (
                      <button
                        onClick={() => {
                          setFormData({
                            ...formData,
                            analytics: {
                              ...formData.analytics,
                              topLocations: [...formData.analytics.topLocations, { city: '', country: '', percentage: '' }]
                            }
                          })
                        }}
                        className="text-sm text-purple-600 hover:text-purple-700"
                      >
                        + Add Another Location
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Identity - Your Essence */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-light text-gray-900">Your Creative Essence</h2>
                    <p className="text-sm text-gray-600">What makes your content uniquely you</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Content Themes You Love (3-5)
                  </label>
                  <input
                    type="text"
                    placeholder="Press enter to add (e.g., sustainable living, cozy mornings)"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg mb-2 focus:ring-2 focus:ring-purple-300"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const value = (e.target as HTMLInputElement).value
                        if (value && formData.identity.contentPillars.length < 5) {
                          setFormData({
                            ...formData,
                            identity: {
                              ...formData.identity,
                              contentPillars: [...formData.identity.contentPillars, value]
                            }
                          });
                          (e.target as HTMLInputElement).value = ''
                        }
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    {formData.identity.contentPillars.map((pillar, index) => (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        key={index} 
                        className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full text-sm"
                      >
                        {pillar} ✨
                      </motion.span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Values That Matter to You
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {BRAND_VALUES.map((value) => (
                      <button
                        key={value}
                        onClick={() => toggleArrayItem('brandValues', value)}
                        className={`p-2 rounded-lg text-sm transition-all ${
                          formData.identity.brandValues.includes(value)
                            ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-white shadow-md'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                        disabled={!formData.identity.brandValues.includes(value) && formData.identity.brandValues.length >= 5}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Your Visual Vibe
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {AESTHETIC_KEYWORDS.map((keyword) => (
                      <button
                        key={keyword}
                        onClick={() => toggleArrayItem('aestheticKeywords', keyword)}
                        className={`p-2 rounded-lg text-sm transition-all ${
                          formData.identity.aestheticKeywords.includes(keyword)
                            ? 'bg-gradient-to-r from-blue-400 to-green-400 text-white shadow-md'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {keyword}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brands You'd Love to Partner With
                  </label>
                  <p className="text-sm text-gray-600 mb-2">
                    Dream big! List brands that align with your values
                  </p>
                  <textarea
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-300"
                    rows={4}
                    placeholder="Patagonia, Glossier, Whole Foods, local coffee shops..."
                    value={formData.identity.dreamBrands.join(', ')}
                    onChange={(e) => setFormData({
                      ...formData,
                      identity: {
                        ...formData.identity,
                        dreamBrands: e.target.value.split(',').map(b => b.trim()).filter(b => b)
                      }
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Boundaries: Industries to Avoid
                  </label>
                  <textarea
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-300"
                    rows={2}
                    placeholder="It's okay to have boundaries! (e.g., fast fashion, tobacco)"
                    value={formData.identity.blacklistIndustries.join(', ')}
                    onChange={(e) => setFormData({
                      ...formData,
                      identity: {
                        ...formData.identity,
                        blacklistIndustries: e.target.value.split(',').map(b => b.trim()).filter(b => b)
                      }
                    })}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Professional - Your Growth */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center">
                    <TreePine className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-light text-gray-900">Your Growth Goals</h2>
                    <p className="text-sm text-gray-600">Let's nurture your creative business</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-blue-50 p-4 rounded-xl mb-6">
                  <p className="text-sm text-green-700">
                    🌱 Remember: Success isn't just about money. It's about sustainable growth 
                    that doesn't sacrifice your wellbeing or authenticity.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Income Goal ($)
                    </label>
                    <input
                      type="number"
                      value={formData.professional.monthlyGoal}
                      onChange={(e) => setFormData({
                        ...formData,
                        professional: { ...formData.professional, monthlyGoal: e.target.value }
                      })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-300"
                      placeholder="Be realistic & kind to yourself"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hours You Want to Work/Week
                    </label>
                    <input
                      type="number"
                      value={formData.professional.hoursPerWeek}
                      onChange={(e) => setFormData({
                        ...formData,
                        professional: { ...formData.professional, hoursPerWeek: e.target.value }
                      })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-300"
                      placeholder="Quality over quantity"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Your Creative Tools
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Phone Camera', 'DSLR/Mirrorless', 'Ring Light', 'Tripod', 'Natural Light Pro', 'Editing Apps', 'Laptop', 'Microphone'].map((item) => (
                      <label key={item} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={formData.professional.equipment.includes(item)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                professional: {
                                  ...formData.professional,
                                  equipment: [...formData.professional.equipment, item]
                                }
                              })
                            } else {
                              setFormData({
                                ...formData,
                                professional: {
                                  ...formData.professional,
                                  equipment: formData.professional.equipment.filter(i => i !== item)
                                }
                              })
                            }
                          }}
                          className="rounded text-purple-500 focus:ring-purple-300"
                        />
                        <span className="text-sm text-gray-700">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How Far You'll Travel for Shoots
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="50"
                    value={formData.professional.travelRadius}
                    onChange={(e) => setFormData({
                      ...formData,
                      professional: { ...formData.professional, travelRadius: e.target.value }
                    })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>Home studio</span>
                    <span className="font-medium text-purple-600">{formData.professional.travelRadius} miles</span>
                    <span>Adventure ready!</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Wellbeing - Your Balance */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center">
                    <Sun className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-light text-gray-900">Your Wellness Boundaries</h2>
                    <p className="text-sm text-gray-600">Protecting your peace is non-negotiable</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-xl mb-6">
                  <p className="text-sm text-orange-700">
                    ☀️ Your mental health matters more than any partnership. We'll use this info 
                    to filter out brands that don't respect creator wellness.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Things That Drain Your Energy (We'll Avoid These)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {WELLNESS_TRIGGERS.map((trigger) => (
                      <label key={trigger} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={formData.wellbeing.stressTriggers.includes(trigger)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                wellbeing: {
                                  ...formData.wellbeing,
                                  stressTriggers: [...formData.wellbeing.stressTriggers, trigger]
                                }
                              })
                            } else {
                              setFormData({
                                ...formData,
                                wellbeing: {
                                  ...formData.wellbeing,
                                  stressTriggers: formData.wellbeing.stressTriggers.filter(t => t !== trigger)
                                }
                              })
                            }
                          }}
                          className="rounded text-purple-500 focus:ring-purple-300"
                        />
                        <span className="text-sm text-gray-700">{trigger}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      How You Prefer to Communicate
                    </label>
                    <select
                      value={formData.wellbeing.communicationPreference}
                      onChange={(e) => setFormData({
                        ...formData,
                        wellbeing: { ...formData.wellbeing, communicationPreference: e.target.value }
                      })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-300"
                    >
                      <option value="email">Email (async is peaceful)</option>
                      <option value="text">Text (quick & easy)</option>
                      <option value="calls">Scheduled calls</option>
                      <option value="flexible">I'm flexible</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Partnerships per Month
                    </label>
                    <select
                      value={formData.wellbeing.maxBrandsPerMonth}
                      onChange={(e) => setFormData({
                        ...formData,
                        wellbeing: { ...formData.wellbeing, maxBrandsPerMonth: e.target.value }
                      })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-300"
                    >
                      <option value="1">1 (Deep focus)</option>
                      <option value="3">3 (Balanced)</option>
                      <option value="5">5 (Active)</option>
                      <option value="10">10 (Very active)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Ideal Work Schedule
                  </label>
                  <select
                    value={formData.wellbeing.preferredWorkHours}
                    onChange={(e) => setFormData({
                      ...formData,
                      wellbeing: { ...formData.wellbeing, preferredWorkHours: e.target.value }
                    })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-300"
                  >
                    <option value="Early bird">Early bird (5AM-12PM)</option>
                    <option value="9-5">Traditional (9AM-5PM)</option>
                    <option value="Night owl">Night owl (12PM-8PM)</option>
                    <option value="Flexible">Flexible (I flow with creativity)</option>
                    <option value="Weekends free">Weekdays only</option>
                  </select>
                </div>

                <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Smile className="w-6 h-6 text-purple-600" />
                    <h3 className="font-medium text-purple-900">You're All Set!</h3>
                  </div>
                  <p className="text-sm text-purple-700">
                    We'll use everything you've shared to find partnerships that respect your 
                    boundaries, align with your values, and support your growth without burnout.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <motion.button
              whileHover={{ scale: currentStep > 1 ? 1.05 : 1 }}
              whileTap={{ scale: currentStep > 1 ? 0.95 : 1 }}
              onClick={handleBack}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all ${
                currentStep === 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg"
            >
              <span>{currentStep === 4 ? 'Start Growing 🌱' : 'Continue'}</span>
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}