'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WellnessButton } from '@/components/wellness/WellnessButton'
import { WellnessCard } from '@/components/wellness/WellnessCard'
import { 
  Mail, 
  Lock, 
  Instagram, 
  Phone, 
  User,
  ArrowRight,
  Check,
  Shield,
  Sparkles,
  Heart
} from 'lucide-react'
import Link from 'next/link'

type PlanType = 'balance' | 'harmony'
type BillingCycle = 'monthly' | 'annual'

export default function SignupPage() {
  const [step, setStep] = useState<'info' | 'plan' | 'payment'>('info')
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('balance')
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    instagramHandle: '',
    phone: ''
  })

  const plans = {
    balance: {
      name: 'Balance',
      tagline: 'Essential wellness for growing creators',
      monthly: 99,
      annual: 899,
      features: [
        'AI content planning & scheduling',
        'Growth analytics & insights',
        'Algorithm change detection',
        'Basic brand matching',
        '5-10 hours saved weekly',
        'Email support'
      ],
      color: 'purple'
    },
    harmony: {
      name: 'Harmony',
      tagline: 'Complete wellness & exponential growth',
      monthly: 999,
      annual: 8999,
      features: [
        'Everything in Balance, plus:',
        'Advanced AI brand partnerships',
        'Automated outreach & negotiation',
        'Priority algorithm insights',
        '15-20 hours saved weekly',
        'Dedicated success manager',
        'Monthly strategy calls',
        'Contract review assistance'
      ],
      color: 'teal',
      popular: true
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [isProcessing, setIsProcessing] = useState(false)

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
    if (!/[!@#$%^&*]/.test(password)) {
      return 'Password must contain at least one special character (!@#$%^&*)'
    }
    return null
  }

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: {[key: string]: string} = {}

    // Validate password strength
    const passwordError = validatePassword(formData.password)
    if (passwordError) {
      newErrors.password = passwordError
    }

    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    // Validate Instagram handle format
    const igHandle = formData.instagramHandle.replace('@', '')
    if (!/^[a-zA-Z0-9._]+$/.test(igHandle)) {
      newErrors.instagramHandle = 'Invalid Instagram handle format'
    }

    // Validate phone number (basic validation)
    const phoneDigits = formData.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setStep('plan')
  }

  const [isCreatingAccount, setIsCreatingAccount] = useState(false)

  const handlePlanSelection = async () => {
    setIsCreatingAccount(true)
    setErrors({})

    // Save user data to database before payment
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          plan: selectedPlan,
          billingCycle
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ submit: data.error || 'Failed to create account' })
        setIsCreatingAccount(false)
        return
      }

      // Store user ID for payment processing
      localStorage.setItem('pending_user_id', data.userId)
      setIsCreatingAccount(false)
      setStep('payment')
    } catch (error) {
      setErrors({ submit: 'Failed to create account. Please try again.' })
      setIsCreatingAccount(false)
    }
  }

  const getPrice = () => {
    const plan = plans[selectedPlan]
    return billingCycle === 'monthly' ? plan.monthly : plan.annual
  }

  const getSavings = () => {
    const plan = plans[selectedPlan]
    const monthlyTotal = plan.monthly * 12
    const annualPrice = plan.annual
    return monthlyTotal - annualPrice
  }

  const handlePayment = async () => {
    setIsProcessing(true)
    setErrors({})

    try {
      const response = await fetch('/api/payment/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          billingCycle
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ payment: data.error || 'Failed to start checkout' })
        setIsProcessing(false)
        return
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      setErrors({ payment: 'Failed to connect to payment service. Please try again.' })
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        {/* Progress indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-2 h-2 rounded-full transition-colors ${
            step === 'info' ? 'bg-wellness-purple' : 'bg-wellness-neutral-300'
          }`} />
          <div className={`w-8 h-0.5 transition-colors ${
            step !== 'info' ? 'bg-wellness-purple' : 'bg-wellness-neutral-300'
          }`} />
          <div className={`w-2 h-2 rounded-full transition-colors ${
            step === 'plan' ? 'bg-wellness-purple' : step === 'payment' ? 'bg-wellness-purple' : 'bg-wellness-neutral-300'
          }`} />
          <div className={`w-8 h-0.5 transition-colors ${
            step === 'payment' ? 'bg-wellness-purple' : 'bg-wellness-neutral-300'
          }`} />
          <div className={`w-2 h-2 rounded-full transition-colors ${
            step === 'payment' ? 'bg-wellness-purple' : 'bg-wellness-neutral-300'
          }`} />
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Account Info */}
          {step === 'info' && (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <WellnessCard className="p-8">
                <h1 className="text-3xl font-display font-light text-wellness-neutral-800 mb-2">Welcome to your wellness journey</h1>
                <p className="text-wellness-neutral-600 mb-8">Let's create your account and get you started</p>

                <form onSubmit={handleInfoSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-wellness-neutral-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-wellness-neutral-400" />
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-3 border border-wellness-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-wellness-purple focus:border-transparent text-wellness-neutral-900 bg-white placeholder:text-wellness-neutral-300"
                        placeholder="Sarah Johnson"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-wellness-neutral-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-wellness-neutral-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-3 border border-wellness-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-wellness-purple focus:border-transparent text-wellness-neutral-900 bg-white placeholder:text-wellness-neutral-300"
                        placeholder="sarah@example.com"
                        required
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-wellness-coral">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-wellness-neutral-700 mb-2">
                      Instagram Handle
                    </label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-wellness-neutral-400" />
                      <input
                        type="text"
                        name="instagramHandle"
                        value={formData.instagramHandle}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-3 border border-wellness-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-wellness-purple focus:border-transparent text-wellness-neutral-900 bg-white placeholder:text-wellness-neutral-300"
                        placeholder="@sarahcreates"
                        required
                      />
                    </div>
                    {errors.instagramHandle && (
                      <p className="mt-1 text-sm text-wellness-coral">{errors.instagramHandle}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-wellness-neutral-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-wellness-neutral-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-3 border border-wellness-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-wellness-purple focus:border-transparent text-wellness-neutral-900 bg-white placeholder:text-wellness-neutral-300"
                        placeholder="+1 (555) 123-4567"
                        required
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-wellness-coral">{errors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-wellness-neutral-700 mb-2">
                      Password
                      <span className="text-xs text-wellness-neutral-500 ml-2">
                        (8+ chars, uppercase, lowercase, number, special char)
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
                        required
                      />
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-wellness-coral">{errors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-wellness-neutral-700 mb-2">
                      Confirm Password
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
                        required
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-wellness-coral">{errors.confirmPassword}</p>
                    )}
                  </div>

                  <WellnessButton type="submit" variant="primary" className="w-full">
                    Continue to Plans
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </WellnessButton>
                </form>

                <p className="text-center text-sm text-wellness-neutral-600 mt-6">
                  Already have an account?{' '}
                  <Link href="/auth/login" className="text-wellness-purple hover:text-wellness-purple-soft">
                    Sign in
                  </Link>
                </p>
              </WellnessCard>
            </motion.div>
          )}

          {/* Step 2: Choose Plan */}
          {step === 'plan' && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-display font-light text-wellness-neutral-800 mb-2">Choose your wellness level</h1>
                <p className="text-wellness-neutral-600">Select the plan that aligns with your growth goals</p>
              </div>

              {/* Billing Toggle */}
              <div className="flex items-center justify-center mb-8">
                <div className="bg-wellness-neutral-100 rounded-full p-1 flex">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                      billingCycle === 'monthly'
                        ? 'bg-white text-wellness-neutral-800 shadow-sm'
                        : 'text-wellness-neutral-600'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle('annual')}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                      billingCycle === 'annual'
                        ? 'bg-white text-wellness-neutral-800 shadow-sm'
                        : 'text-wellness-neutral-600'
                    }`}
                  >
                    Annual
                    <span className="ml-2 text-wellness-green text-xs">Save ${getSavings()}/yr</span>
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Balance Plan */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedPlan('balance')}
                  className="cursor-pointer"
                >
                  <WellnessCard 
                    className={`p-6 h-full transition-all ${
                      selectedPlan === 'balance' 
                        ? 'ring-2 ring-wellness-purple bg-wellness-purple-light/30' 
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-display font-medium text-wellness-neutral-800 flex items-center gap-2">
                          <Heart className="w-6 h-6 text-wellness-purple" />
                          {plans.balance.name}
                        </h3>
                        <p className="text-sm text-wellness-neutral-600 mt-1">{plans.balance.tagline}</p>
                      </div>
                      {selectedPlan === 'balance' && (
                        <div className="w-6 h-6 bg-wellness-purple rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="mb-6">
                      <span className="text-4xl font-light text-wellness-neutral-800">
                        ${billingCycle === 'monthly' ? plans.balance.monthly : plans.balance.annual}
                      </span>
                      <span className="text-wellness-neutral-600 ml-2">
                        /{billingCycle === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>

                    <ul className="space-y-3">
                      {plans.balance.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-wellness-neutral-700">
                          <Check className="w-4 h-4 text-wellness-purple mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </WellnessCard>
                </motion.div>

                {/* Harmony Plan */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedPlan('harmony')}
                  className="cursor-pointer relative"
                >
                  {plans.harmony.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                      <span className="bg-gradient-to-r from-wellness-purple to-wellness-teal text-white px-4 py-1 rounded-full text-sm">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <WellnessCard 
                    className={`p-6 h-full transition-all ${
                      selectedPlan === 'harmony' 
                        ? 'ring-2 ring-wellness-teal bg-wellness-teal-light/30' 
                        : ''
                    }`}
                    glow={plans.harmony.popular}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-display font-medium text-wellness-neutral-800 flex items-center gap-2">
                          <Sparkles className="w-6 h-6 text-wellness-teal" />
                          {plans.harmony.name}
                        </h3>
                        <p className="text-sm text-wellness-neutral-600 mt-1">{plans.harmony.tagline}</p>
                      </div>
                      {selectedPlan === 'harmony' && (
                        <div className="w-6 h-6 bg-wellness-teal rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="mb-6">
                      <span className="text-4xl font-light text-wellness-neutral-800">
                        ${billingCycle === 'monthly' ? plans.harmony.monthly : plans.harmony.annual}
                      </span>
                      <span className="text-wellness-neutral-600 ml-2">
                        /{billingCycle === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>

                    <ul className="space-y-3">
                      {plans.harmony.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-wellness-neutral-700">
                          <Check className="w-4 h-4 text-wellness-teal mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </WellnessCard>
                </motion.div>
              </div>

              {errors.submit && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
                  {errors.submit}
                </div>
              )}

              <div className="mt-8 flex gap-4">
                <WellnessButton
                  variant="ghost"
                  onClick={() => setStep('info')}
                  className="flex-1"
                  disabled={isCreatingAccount}
                >
                  Back
                </WellnessButton>
                <WellnessButton
                  variant="primary"
                  onClick={handlePlanSelection}
                  className="flex-1"
                  disabled={isCreatingAccount}
                >
                  {isCreatingAccount ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Continue to Payment
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </WellnessButton>
              </div>
            </motion.div>
          )}

          {/* Step 3: Payment */}
          {step === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <WellnessCard className="p-8">
                <h1 className="text-3xl font-display font-light text-wellness-neutral-800 mb-2">Complete your journey</h1>
                <p className="text-wellness-neutral-600 mb-8">Secure payment via Stripe</p>

                {/* Order Summary */}
                <div className="bg-wellness-neutral-50 rounded-xl p-6 mb-8">
                  <h3 className="font-medium text-wellness-neutral-800 mb-4">Order Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-wellness-neutral-600">
                        {plans[selectedPlan].name} Plan ({billingCycle})
                      </span>
                      <span className="font-medium text-wellness-neutral-800">
                        ${getPrice()}
                      </span>
                    </div>
                    {billingCycle === 'annual' && (
                      <div className="flex justify-between text-wellness-green text-sm">
                        <span>Annual savings</span>
                        <span>-${getSavings()}</span>
                      </div>
                    )}
                    <div className="border-t border-wellness-neutral-200 pt-3 flex justify-between">
                      <span className="font-medium text-wellness-neutral-800">Total due today</span>
                      <span className="text-2xl font-light text-wellness-neutral-800">
                        ${getPrice()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Button */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-wellness-purple-light/30 to-wellness-teal-light/30 rounded-xl p-6 text-center">
                    <Shield className="w-12 h-12 text-wellness-purple mx-auto mb-3" />
                    <p className="text-wellness-neutral-700 font-medium">Secure checkout powered by Stripe</p>
                    <p className="text-sm text-wellness-neutral-500 mt-2">Your payment info is never stored on our servers</p>
                  </div>

                  {errors.payment && (
                    <div className="bg-wellness-coral/10 border border-wellness-coral/30 rounded-xl p-4 text-center">
                      <p className="text-wellness-coral text-sm">{errors.payment}</p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <WellnessButton
                      variant="ghost"
                      onClick={() => setStep('plan')}
                      className="flex-1"
                      disabled={isProcessing}
                    >
                      Back
                    </WellnessButton>
                    <WellnessButton
                      variant="primary"
                      className="flex-1"
                      onClick={handlePayment}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          Complete Payment
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </WellnessButton>
                  </div>

                  <p className="text-center text-xs text-wellness-neutral-500 mt-4">
                    By continuing, you agree to our{' '}
                    <Link href="/terms" className="text-wellness-purple hover:text-wellness-purple-soft">Terms</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-wellness-purple hover:text-wellness-purple-soft">Privacy Policy</Link>
                  </p>
                </div>
              </WellnessCard>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}