'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'
import { WellnessButton } from '@/components/wellness/WellnessButton'
import { WellnessCard } from '@/components/wellness/WellnessCard'

export default function AuthError({ searchParams }: { searchParams: { error?: string } }) {
  const getErrorMessage = (error: string | undefined) => {
    switch (error) {
      case 'instagram_auth_denied':
        return {
          title: 'Connection Paused',
          message: "It looks like you changed your mind about connecting Instagram. That's perfectly okay! Take your time and connect when you're ready.",
          suggestion: 'No pressure - your wellness journey can start whenever you feel comfortable.'
        }
      case 'missing_code':
        return {
          title: 'Connection Interrupted',
          message: 'Something went wrong during the Instagram connection process.',
          suggestion: "Let's try again with a fresh start. Sometimes technology just needs a second chance."
        }
      case 'authentication_failed':
        return {
          title: 'Connection Hiccup',
          message: "We couldn't complete the Instagram connection this time.",
          suggestion: "These things happen! Let's give it another try, or reach out if you need help."
        }
      default:
        return {
          title: 'Unexpected Pause',
          message: 'Something unexpected happened during the connection process.',
          suggestion: "Let's take a breath and try again. We're here to help if you need support."
        }
    }
  }

  const errorInfo = getErrorMessage(searchParams.error)

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full"
      >
        <WellnessCard className="p-8 text-center">
          {/* Icon */}
          <motion.div 
            className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </motion.div>
          
          {/* Title */}
          <motion.h1 
            className="text-2xl font-medium text-gray-800 mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {errorInfo.title}
          </motion.h1>
          
          {/* Message */}
          <motion.p 
            className="text-gray-600 mb-4 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {errorInfo.message}
          </motion.p>
          
          {/* Suggestion */}
          <motion.p 
            className="text-sm text-gray-500 mb-8 italic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {errorInfo.suggestion}
          </motion.p>
          
          {/* Actions */}
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Link href="/api/auth/instagram" className="block">
              <WellnessButton variant="primary" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try connecting again
              </WellnessButton>
            </Link>
            
            <Link href="/" className="block">
              <WellnessButton variant="ghost" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Back to home
              </WellnessButton>
            </Link>
          </motion.div>

          {/* Help text */}
          <motion.p 
            className="text-xs text-gray-500 mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            Need help? <a href="mailto:hello@socialechelon.com" className="text-purple-600 hover:text-purple-700">Contact our support team</a>
          </motion.p>
        </WellnessCard>
      </motion.div>
    </div>
  )
}