'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Instagram, Shield, Clock, Heart, ArrowRight, Check } from 'lucide-react'
import { WellnessButton } from '@/components/wellness/WellnessButton'
import { WellnessCard } from '@/components/wellness/WellnessCard'
import Link from 'next/link'

export default function ConnectPage() {
  const [isConnecting, setIsConnecting] = useState(false)
  
  const benefits = [
    {
      icon: <Clock className="w-5 h-5 text-purple-600" />,
      title: "Save 15+ hours weekly",
      description: "AI handles analytics, content planning, and outreach"
    },
    {
      icon: <Heart className="w-5 h-5 text-teal-600" />,
      title: "Reduce creator burnout",
      description: "Focus on creating while we handle the business side"
    },
    {
      icon: <Shield className="w-5 h-5 text-green-600" />,
      title: "Secure & private",
      description: "Your data is encrypted and never shared"
    }
  ]

  const handleConnect = () => {
    setIsConnecting(true)
    // Redirect will happen via the Link component
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl w-full"
      >
        {/* Main Card */}
        <WellnessCard className="p-8 md:p-12" glow>
          {/* Logo/Icon */}
          <motion.div 
            className="w-20 h-20 bg-gradient-to-br from-purple-100 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-8"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <Instagram className="w-10 h-10 text-purple-600" />
          </motion.div>

          {/* Title */}
          <motion.h1 
            className="text-3xl md:text-4xl font-light text-center text-gray-800 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Connect your Instagram
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            className="text-center text-gray-600 mb-10 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Let's start your wellness journey with a simple, secure connection
          </motion.p>

          {/* Benefits */}
          <motion.div 
            className="space-y-4 mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                className="flex items-start gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <div className="p-2 bg-gray-50 rounded-lg">
                  {benefit.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800 mb-1">{benefit.title}</h3>
                  <p className="text-sm text-gray-600">{benefit.description}</p>
                </div>
                <Check className="w-4 h-4 text-green-500 mt-1" />
              </motion.div>
            ))}
          </motion.div>

          {/* What happens next */}
          <motion.div 
            className="bg-purple-50/50 rounded-xl p-6 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <h3 className="font-medium text-gray-800 mb-3">What happens when you connect:</h3>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-medium">1.</span>
                You'll be redirected to Instagram to authorize the connection
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-medium">2.</span>
                We'll analyze your content to understand your style
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-medium">3.</span>
                You'll see your personalized wellness dashboard immediately
              </li>
            </ol>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Link href="/api/auth/instagram" onClick={handleConnect}>
              <WellnessButton 
                variant="primary" 
                size="lg" 
                className="w-full"
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Redirecting to Instagram...
                  </>
                ) : (
                  <>
                    <Instagram className="w-5 h-5 mr-2" />
                    Connect with Instagram
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </WellnessButton>
            </Link>
          </motion.div>

          {/* Privacy note */}
          <motion.p 
            className="text-center text-xs text-gray-500 mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <Shield className="w-3 h-3 inline mr-1" />
            We only access public profile data and your posts. 
            <br />
            Read our <Link href="/privacy" className="text-purple-600 hover:text-purple-700">privacy policy</Link> to learn more.
          </motion.p>
        </WellnessCard>

        {/* Back link */}
        <motion.div 
          className="text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          <Link href="/" className="text-gray-600 hover:text-gray-800 text-sm">
            ← Back to home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}