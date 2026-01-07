'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { WellnessButton } from '@/components/wellness/WellnessButton'
import { WellnessCard } from '@/components/wellness/WellnessCard'
import {
  Mail,
  Lock,
  Building2,
  Globe,
  User,
  ArrowRight,
  Sparkles,
  Users,
  Target,
  CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function BrandSignupPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    password: '',
    confirmPassword: '',
    website: '',
    industry: ''
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  const industries = [
    'Fashion & Apparel',
    'Beauty & Skincare',
    'Health & Wellness',
    'Food & Beverage',
    'Technology',
    'Travel & Hospitality',
    'Home & Lifestyle',
    'Fitness & Sports',
    'Entertainment',
    'Finance',
    'Education',
    'Other'
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' })
    }
  }

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters'
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: {[key: string]: string} = {}

    // Validate required fields
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required'
    }
    if (!formData.contactName.trim()) {
      newErrors.contactName = 'Contact name is required'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    }

    // Validate password
    const passwordError = validatePassword(formData.password)
    if (passwordError) {
      newErrors.password = passwordError
    }

    // Check passwords match
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    // Validate website format if provided
    if (formData.website && !formData.website.match(/^https?:\/\/.+/)) {
      if (!formData.website.startsWith('http')) {
        setFormData({ ...formData, website: `https://${formData.website}` })
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const response = await fetch('/api/auth/brand-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ submit: data.error || 'Failed to create account' })
        setIsSubmitting(false)
        return
      }

      // Redirect to brand onboarding
      router.push('/onboarding/brand')
    } catch (error) {
      setErrors({ submit: 'Something went wrong. Please try again.' })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full"
      >
        <WellnessCard className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-3xl font-display font-light text-wellness-neutral-800 mb-2">
              Partner with Creators
            </h1>
            <p className="text-wellness-neutral-600">
              Join Social Echelon to connect with wellness-focused creators
            </p>
          </div>

          {/* Value Props */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center p-3 bg-purple-50 rounded-xl">
              <Users className="w-5 h-5 text-purple-500 mx-auto mb-1" />
              <p className="text-xs text-purple-700">Pre-vetted Creators</p>
            </div>
            <div className="text-center p-3 bg-pink-50 rounded-xl">
              <Target className="w-5 h-5 text-pink-500 mx-auto mb-1" />
              <p className="text-xs text-pink-700">AI-Powered Matching</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <Sparkles className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-xs text-green-700">Free to Join</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-wellness-neutral-700 mb-2">
                  Company Name *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-wellness-neutral-400" />
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-wellness-purple focus:border-transparent text-wellness-neutral-900 bg-white placeholder:text-wellness-neutral-300 ${
                      errors.companyName ? 'border-wellness-coral' : 'border-wellness-neutral-200'
                    }`}
                    placeholder="Your Brand"
                  />
                </div>
                {errors.companyName && (
                  <p className="mt-1 text-sm text-wellness-coral">{errors.companyName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-wellness-neutral-700 mb-2">
                  Your Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-wellness-neutral-400" />
                  <input
                    type="text"
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-wellness-purple focus:border-transparent text-wellness-neutral-900 bg-white placeholder:text-wellness-neutral-300 ${
                      errors.contactName ? 'border-wellness-coral' : 'border-wellness-neutral-200'
                    }`}
                    placeholder="Jane Smith"
                  />
                </div>
                {errors.contactName && (
                  <p className="mt-1 text-sm text-wellness-coral">{errors.contactName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-wellness-neutral-700 mb-2">
                Work Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-wellness-neutral-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-wellness-purple focus:border-transparent text-wellness-neutral-900 bg-white placeholder:text-wellness-neutral-300 ${
                    errors.email ? 'border-wellness-coral' : 'border-wellness-neutral-200'
                  }`}
                  placeholder="jane@yourbrand.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-wellness-coral">{errors.email}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-wellness-neutral-700 mb-2">
                  Website
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-wellness-neutral-400" />
                  <input
                    type="text"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-3 border border-wellness-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-wellness-purple focus:border-transparent text-wellness-neutral-900 bg-white placeholder:text-wellness-neutral-300"
                    placeholder="yourbrand.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-wellness-neutral-700 mb-2">
                  Industry
                </label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  className="w-full px-3 py-3 border border-wellness-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-wellness-purple focus:border-transparent text-wellness-neutral-900 bg-white"
                >
                  <option value="">Select industry</option>
                  {industries.map((industry) => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-wellness-neutral-700 mb-2">
                Password *
                <span className="text-xs text-wellness-neutral-500 ml-2">
                  (8+ chars, uppercase, lowercase, number)
                </span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-wellness-neutral-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-wellness-purple focus:border-transparent text-wellness-neutral-900 bg-white placeholder:text-wellness-neutral-300 ${
                    errors.password ? 'border-wellness-coral' : 'border-wellness-neutral-200'
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-wellness-coral">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-wellness-neutral-700 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-wellness-neutral-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-wellness-purple focus:border-transparent text-wellness-neutral-900 bg-white placeholder:text-wellness-neutral-300 ${
                    errors.confirmPassword ? 'border-wellness-coral' : 'border-wellness-neutral-200'
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-wellness-coral">{errors.confirmPassword}</p>
              )}
            </div>

            {errors.submit && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
                {errors.submit}
              </div>
            )}

            <WellnessButton
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Brand Account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </WellnessButton>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-wellness-neutral-200">
            <p className="text-center text-sm text-wellness-neutral-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-wellness-purple hover:text-wellness-purple-soft">
                Sign in
              </Link>
            </p>
            <p className="text-center text-sm text-wellness-neutral-500 mt-2">
              Are you a creator?{' '}
              <Link href="/auth/signup" className="text-wellness-purple hover:text-wellness-purple-soft">
                Sign up as a creator
              </Link>
            </p>
          </div>

          {/* Trust indicators */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-wellness-neutral-500">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>Free to join</span>
            <span className="text-wellness-neutral-300">•</span>
            <span>No credit card required</span>
            <span className="text-wellness-neutral-300">•</span>
            <span>Cancel anytime</span>
          </div>
        </WellnessCard>
      </motion.div>
    </div>
  )
}
