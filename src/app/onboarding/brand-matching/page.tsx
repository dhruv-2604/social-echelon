'use client'

import { useState } from 'react'
import { ChevronRight, ChevronLeft, Instagram, Target, DollarSign, Heart, Check, Info } from 'lucide-react'
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

const STRESS_TRIGGERS = [
  'Rejection emails', 'Slow payments', 'Tight deadlines', 'Revision requests',
  'Contract negotiations', 'Content approval delays', 'Exclusivity demands',
  'Low engagement', 'Creative differences', 'Communication gaps'
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
      maxBrandsPerMonth: '5',
      preferredWorkHours: '9AM-5PM'
    }
  })

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    } else {
      // Submit the data
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
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
              currentStep >= step 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                : 'bg-gray-200 text-gray-500'
            }`}>
              {currentStep > step ? <Check className="w-5 h-5" /> : step}
            </div>
            {step < 4 && (
              <div className={`w-20 h-1 mx-2 transition-colors ${
                currentStep > step ? 'bg-purple-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Let's Find Your Perfect Brand Matches
          </h1>
          <p className="text-gray-600">
            {currentStep === 1 && "Share your Instagram analytics to understand your audience"}
            {currentStep === 2 && "Tell us about your content and values"}
            {currentStep === 3 && "Set up your professional preferences"}
            {currentStep === 4 && "Customize your work-life balance"}
          </p>
        </div>

        <StepIndicator />

        <div className="bg-white rounded-xl shadow-sm p-8">
          {/* Step 1: Analytics */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <Instagram className="w-8 h-8 text-pink-500" />
                <h2 className="text-2xl font-semibold">Instagram Analytics</h2>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-600">
                  ✨ We've already collected your basic Instagram metrics (followers, engagement rate) from your connected account. 
                  Now we need some additional insights about your audience that Instagram doesn't provide directly.
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
                    className="w-full p-3 border rounded-lg"
                    placeholder="e.g., 1200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Growth Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.analytics.growthRate}
                    onChange={(e) => setFormData({
                      ...formData,
                      analytics: { ...formData.analytics, growthRate: e.target.value }
                    })}
                    className="w-full p-3 border rounded-lg"
                    placeholder="e.g., 8.5"
                  />
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Audience Age Ranges</h3>
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
                        className="flex-1 p-2 border rounded"
                        placeholder="Percentage"
                      />
                      <span className="text-gray-500">%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Top Audience Locations</h3>
                  <div className="group relative">
                    <Info className="w-5 h-5 text-gray-400 cursor-help" />
                    <div className="absolute right-0 top-6 w-72 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <p className="mb-2">💡 <strong>Pro tip:</strong> Add specific cities if you want to work with local brands!</p>
                      <p className="text-gray-300">For example, if 30% of your audience is in NYC, you'll match with NYC restaurants, boutiques, and events. Leave city blank for national/global brands.</p>
                      <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">Add your top 3-5 audience locations with percentages</p>
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
                        className="flex-1 p-2 border rounded"
                        placeholder="City - Optional (e.g., NYC, LA)"
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
                        className="flex-1 p-2 border rounded"
                        placeholder="Country (e.g., USA)"
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
                        className="w-20 p-2 border rounded"
                        placeholder="%"
                      />
                      {formData.analytics.topLocations.length > 1 && (
                        <button
                          onClick={() => {
                            const updated = formData.analytics.topLocations.filter((_, i) => i !== index)
                            setFormData({
                              ...formData,
                              analytics: { ...formData.analytics, topLocations: updated }
                            })
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      )}
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

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Gender Split</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm text-gray-600">Female %</label>
                    <input
                      type="number"
                      value={formData.analytics.genderSplit.female}
                      onChange={(e) => setFormData({
                        ...formData,
                        analytics: {
                          ...formData.analytics,
                          genderSplit: { ...formData.analytics.genderSplit, female: e.target.value }
                        }
                      })}
                      className="w-full mt-1 p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Male %</label>
                    <input
                      type="number"
                      value={formData.analytics.genderSplit.male}
                      onChange={(e) => setFormData({
                        ...formData,
                        analytics: {
                          ...formData.analytics,
                          genderSplit: { ...formData.analytics.genderSplit, male: e.target.value }
                        }
                      })}
                      className="w-full mt-1 p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Other %</label>
                    <input
                      type="number"
                      value={formData.analytics.genderSplit.other}
                      onChange={(e) => setFormData({
                        ...formData,
                        analytics: {
                          ...formData.analytics,
                          genderSplit: { ...formData.analytics.genderSplit, other: e.target.value }
                        }
                      })}
                      className="w-full mt-1 p-2 border rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Identity */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <Target className="w-8 h-8 text-purple-500" />
                <h2 className="text-2xl font-semibold">Your Creator Identity</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Content Pillars (Select 3-5)
                </label>
                <input
                  type="text"
                  placeholder="e.g., sustainable fashion, minimalist lifestyle"
                  className="w-full p-3 border rounded-lg mb-2"
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
                    <span key={index} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                      {pillar}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Brand Values (Select up to 5)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {BRAND_VALUES.map((value) => (
                    <button
                      key={value}
                      onClick={() => toggleArrayItem('brandValues', value)}
                      className={`p-2 rounded-lg text-sm transition-colors ${
                        formData.identity.brandValues.includes(value)
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                  Aesthetic Keywords
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {AESTHETIC_KEYWORDS.map((keyword) => (
                    <button
                      key={keyword}
                      onClick={() => toggleArrayItem('aestheticKeywords', keyword)}
                      className={`p-2 rounded-lg text-sm transition-colors ${
                        formData.identity.aestheticKeywords.includes(keyword)
                          ? 'bg-pink-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Past Brand Collaborations
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  List any brands you've worked with before (helps us find similar opportunities)
                </p>
                <textarea
                  className="w-full p-3 border rounded-lg"
                  rows={3}
                  placeholder="Enter brand names separated by commas (e.g., Adidas, Sephora, Whole Foods...)"
                  value={formData.identity.pastBrands.join(', ')}
                  onChange={(e) => setFormData({
                    ...formData,
                    identity: {
                      ...formData.identity,
                      pastBrands: e.target.value.split(',').map(b => b.trim()).filter(b => b)
                    }
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank if you haven't worked with brands yet - that's totally fine!
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dream Brand Collaborations
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  Which brands would you love to work with? List as many as you'd like!
                </p>
                <textarea
                  className="w-full p-3 border rounded-lg"
                  rows={4}
                  placeholder="Enter brand names separated by commas (e.g., Nike, Patagonia, Glossier, Apple, Lululemon...)"
                  value={formData.identity.dreamBrands.join(', ')}
                  onChange={(e) => setFormData({
                    ...formData,
                    identity: {
                      ...formData.identity,
                      dreamBrands: e.target.value.split(',').map(b => b.trim()).filter(b => b)
                    }
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  The more brands you list, the better we can understand your style and preferences!
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industries to Avoid
                </label>
                <textarea
                  className="w-full p-3 border rounded-lg"
                  rows={2}
                  placeholder="Alcohol, tobacco, fast fashion..."
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
            </div>
          )}

          {/* Step 3: Professional */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <DollarSign className="w-8 h-8 text-green-500" />
                <h2 className="text-2xl font-semibold">Professional Setup</h2>
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
                    className="w-full p-3 border rounded-lg"
                    placeholder="e.g., 5000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hours Available per Week
                  </label>
                  <input
                    type="number"
                    value={formData.professional.hoursPerWeek}
                    onChange={(e) => setFormData({
                      ...formData,
                      professional: { ...formData.professional, hoursPerWeek: e.target.value }
                    })}
                    className="w-full p-3 border rounded-lg"
                    placeholder="e.g., 20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Equipment & Tools
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['DSLR Camera', 'Smartphone', 'Ring Light', 'Tripod', 'Gimbal', 'Drone', 'Microphone', 'Editing Software'].map((item) => (
                    <label key={item} className="flex items-center space-x-2">
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
                        className="rounded text-purple-500"
                      />
                      <span className="text-sm text-gray-700">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Travel Radius (miles)
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
                  <span>Local only</span>
                  <span>{formData.professional.travelRadius} miles</span>
                  <span>Nationwide</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Wellbeing */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <Heart className="w-8 h-8 text-red-500" />
                <h2 className="text-2xl font-semibold">Work-Life Balance</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Stress Triggers (Select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {STRESS_TRIGGERS.map((trigger) => (
                    <label key={trigger} className="flex items-center space-x-2">
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
                        className="rounded text-purple-500"
                      />
                      <span className="text-sm text-gray-700">{trigger}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Communication Preference
                  </label>
                  <select
                    value={formData.wellbeing.communicationPreference}
                    onChange={(e) => setFormData({
                      ...formData,
                      wellbeing: { ...formData.wellbeing, communicationPreference: e.target.value }
                    })}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="text">Text Message</option>
                    <option value="video">Video Call</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Brands per Month
                  </label>
                  <input
                    type="number"
                    value={formData.wellbeing.maxBrandsPerMonth}
                    onChange={(e) => setFormData({
                      ...formData,
                      wellbeing: { ...formData.wellbeing, maxBrandsPerMonth: e.target.value }
                    })}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Work Hours
                </label>
                <input
                  type="text"
                  value={formData.wellbeing.preferredWorkHours}
                  onChange={(e) => setFormData({
                    ...formData,
                    wellbeing: { ...formData.wellbeing, preferredWorkHours: e.target.value }
                  })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="e.g., 9AM-5PM EST"
                />
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-2">Your Wellbeing Matters</h3>
                <p className="text-sm text-purple-700">
                  We'll use this information to protect your mental health by filtering opportunities,
                  managing workload, and providing support when needed.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={handleBack}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
                currentStep === 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <button
              onClick={handleNext}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
            >
              <span>{currentStep === 4 ? 'Complete Setup' : 'Next'}</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}