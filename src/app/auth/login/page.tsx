'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { WellnessButton } from '@/components/wellness/WellnessButton'
import { WellnessCard } from '@/components/wellness/WellnessCard'
import {
  Mail,
  Lock,
  ArrowRight,
  Sun,
  Moon,
  Coffee,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const timeIcon = hour < 12 ? <Sun className="w-5 h-5 text-wellness-yellow" /> : 
                   hour < 18 ? <Coffee className="w-5 h-5 text-wellness-coral" /> : 
                   <Moon className="w-5 h-5 text-wellness-purple" />

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to sign in')
        setIsLoading(false)
        return
      }

      // Redirect based on response
      window.location.href = data.redirectTo || '/dashboard'
    } catch (error) {
      setError('Failed to sign in. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full"
      >
        <WellnessCard className="p-8">
          {/* Greeting */}
          <motion.div
            className="flex items-center justify-center gap-2 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {timeIcon}
            <span className="text-wellness-neutral-600">{greeting}</span>
          </motion.div>

          {/* Title */}
          <motion.h1 
            className="text-3xl font-display font-bold text-center text-wellness-neutral-900 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Welcome back
          </motion.h1>
          
          <motion.p 
            className="text-center text-wellness-neutral-500 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Continue your wellness journey
          </motion.p>

          {/* Login Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}

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
                  className="w-full pl-10 pr-3 py-3 border border-wellness-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-wellness-purple focus:border-transparent transition-all text-wellness-neutral-900 bg-white placeholder:text-wellness-neutral-300"
                  placeholder="sarah@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-wellness-neutral-700">
                  Password
                </label>
                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm text-wellness-purple hover:text-wellness-purple-soft"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-wellness-neutral-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-3 border border-wellness-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-wellness-purple focus:border-transparent transition-all text-wellness-neutral-900 bg-white placeholder:text-wellness-neutral-300"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 text-wellness-purple border-wellness-neutral-300 rounded focus:ring-wellness-purple"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-wellness-neutral-600">
                Keep me signed in
              </label>
            </div>

            <WellnessButton 
              type="submit" 
              variant="primary" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </WellnessButton>
          </motion.form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-wellness-neutral-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-wellness-neutral-500">or</span>
            </div>
          </div>

          {/* Instagram Login Option */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Link href="/auth/connect">
              <WellnessButton variant="secondary" className="w-full">
                Continue with Instagram
              </WellnessButton>
            </Link>
          </motion.div>

          {/* Sign up link */}
          <motion.p 
            className="text-center text-sm text-wellness-neutral-600 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            New to Social Echelon?{' '}
            <Link href="/auth/signup" className="text-wellness-purple hover:text-wellness-purple-soft font-medium">
              Create an account
            </Link>
          </motion.p>
        </WellnessCard>

        {/* Back to home */}
        <motion.div 
          className="text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Link href="/" className="text-wellness-neutral-500 hover:text-wellness-neutral-700 text-sm">
            ← Back to home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}