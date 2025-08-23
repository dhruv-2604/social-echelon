'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WellnessButton } from '@/components/wellness/WellnessButton'
import { WellnessCard } from '@/components/wellness/WellnessCard'
import { 
  Sparkles, 
  Heart, 
  Zap, 
  Clock,
  Shield,
  Users,
  ArrowRight,
  ChevronDown,
  Sun,
  Moon,
  Coffee
} from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)
  
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const timeIcon = hour < 12 ? <Sun className="w-5 h-5 text-yellow-500" /> : 
                   hour < 18 ? <Coffee className="w-5 h-5 text-amber-600" /> : 
                   <Moon className="w-5 h-5 text-indigo-500" />

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercentage = Math.min(window.scrollY / 500, 1)
      setScrollProgress(scrollPercentage)
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen relative">
      {/* Hero Section - Minimal and Calming */}
      <motion.section 
        className="min-h-screen flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="max-w-4xl mx-auto text-center">
          {/* Time-based greeting */}
          <motion.div
            className="flex items-center justify-center gap-2 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {timeIcon}
            <span className="text-gray-600 text-lg">{greeting}</span>
          </motion.div>

          {/* Main headline */}
          <motion.h1 
            className="text-5xl md:text-7xl font-light text-gray-800 mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Your business grows while you
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-teal-600">
              take care of yourself
            </span>
          </motion.h1>

          <motion.p 
            className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            AI handles the hustle. You focus on creating, connecting, and living well.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link href="/auth/signup">
              <WellnessButton variant="primary" size="lg">
                Start your wellness journey
              </WellnessButton>
            </Link>
            <Link href="/auth/login">
              <WellnessButton variant="ghost" size="lg">
                Sign in
              </WellnessButton>
            </Link>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="mt-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5, y: [0, 10, 0] }}
            transition={{ 
              opacity: { delay: 1, duration: 0.5 },
              y: { delay: 1.5, repeat: Infinity, duration: 1.5 }
            }}
          >
            <ChevronDown className="w-6 h-6 text-gray-400 mx-auto" />
          </motion.div>
        </div>
      </motion.section>

      {/* Value Props - What We Handle */}
      <motion.section 
        className="py-20 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: scrollProgress > 0.2 ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            className="text-3xl md:text-4xl font-light text-center text-gray-800 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: scrollProgress > 0.3 ? 1 : 0, y: scrollProgress > 0.3 ? 0 : 20 }}
            transition={{ duration: 0.6 }}
          >
            While you were away...
          </motion.h2>
          <motion.p
            className="text-center text-gray-600 mb-16 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: scrollProgress > 0.35 ? 1 : 0 }}
            transition={{ duration: 0.6 }}
          >
            Here's what your AI handled today
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ 
                opacity: scrollProgress > 0.4 ? 1 : 0,
                y: scrollProgress > 0.4 ? 0 : 30
              }}
              transition={{ duration: 0.6 }}
            >
              <WellnessCard className="h-full">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Heart className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">5 hours saved</h3>
                    <p className="text-gray-600">
                      Analyzed 127 posts, detected algorithm changes, and optimized your content strategy
                    </p>
                  </div>
                </div>
              </WellnessCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ 
                opacity: scrollProgress > 0.45 ? 1 : 0,
                y: scrollProgress > 0.45 ? 0 : 30
              }}
              transition={{ duration: 0.6 }}
            >
              <WellnessCard className="h-full">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-teal-100 rounded-full">
                    <Users className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">3 brands matched</h3>
                    <p className="text-gray-600">
                      Perfect-fit partnerships identified, outreach drafted, ready for your review
                    </p>
                  </div>
                </div>
              </WellnessCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ 
                opacity: scrollProgress > 0.5 ? 1 : 0,
                y: scrollProgress > 0.5 ? 0 : 30
              }}
              transition={{ duration: 0.6 }}
            >
              <WellnessCard className="h-full">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <Sparkles className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">Content planned</h3>
                    <p className="text-gray-600">
                      Next week's posts created with trending topics and optimal timing
                    </p>
                  </div>
                </div>
              </WellnessCard>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* How It Works - Simple Steps */}
      <motion.section 
        className="py-20 px-4 bg-gradient-to-b from-transparent to-purple-50/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: scrollProgress > 0.6 ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-light text-center text-gray-800 mb-16">
            Effortless growth in three steps
          </h2>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ 
                opacity: scrollProgress > 0.65 ? 1 : 0,
                x: scrollProgress > 0.65 ? 0 : -30
              }}
              transition={{ duration: 0.6 }}
            >
              <WellnessCard glow>
                <div className="flex items-center gap-6">
                  <div className="text-4xl font-light text-purple-600">01</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-medium text-gray-800 mb-2">Connect your Instagram</h3>
                    <p className="text-gray-600">
                      Secure one-click connection. We analyze your content and audience in seconds.
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </WellnessCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ 
                opacity: scrollProgress > 0.7 ? 1 : 0,
                x: scrollProgress > 0.7 ? 0 : -30
              }}
              transition={{ duration: 0.6 }}
            >
              <WellnessCard glow>
                <div className="flex items-center gap-6">
                  <div className="text-4xl font-light text-teal-600">02</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-medium text-gray-800 mb-2">AI learns your style</h3>
                    <p className="text-gray-600">
                      Our AI understands your voice, aesthetic, and goals to create authentic strategies.
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </WellnessCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ 
                opacity: scrollProgress > 0.75 ? 1 : 0,
                x: scrollProgress > 0.75 ? 0 : -30
              }}
              transition={{ duration: 0.6 }}
            >
              <WellnessCard glow>
                <div className="flex items-center gap-6">
                  <div className="text-4xl font-light text-green-600">03</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-medium text-gray-800 mb-2">Focus on what matters</h3>
                    <p className="text-gray-600">
                      Create content you love while AI handles analytics, outreach, and optimization.
                    </p>
                  </div>
                  <Zap className="w-5 h-5 text-yellow-500" />
                </div>
              </WellnessCard>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Pricing - Simplified */}
      <motion.section 
        className="py-20 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: scrollProgress > 0.8 ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-light text-center text-gray-800 mb-4">
            Investment in your wellbeing
          </h2>
          <p className="text-center text-gray-600 mb-16 text-lg">
            Choose the path that feels right for you
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <WellnessCard className="relative">
              <div className="p-8">
                <h3 className="text-2xl font-medium text-gray-800 mb-2">Essential</h3>
                <div className="text-4xl font-light text-gray-800 mb-1">
                  $97<span className="text-lg text-gray-500">/month</span>
                </div>
                <p className="text-gray-600 mb-8">For creators ready to reclaim their time</p>
                
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center text-gray-700">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-3" />
                    AI content planning
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-3" />
                    Growth analytics
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-3" />
                    Algorithm insights
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-3" />
                    5 hours saved weekly
                  </li>
                </ul>
                
                <Link href="/auth/signup" className="block">
                  <WellnessButton variant="secondary" className="w-full">
                    Get started
                  </WellnessButton>
                </Link>
              </div>
            </WellnessCard>

            <WellnessCard className="relative border-2 border-purple-200" glow>
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-purple-600 to-teal-600 text-white px-4 py-1 rounded-full text-sm">
                  Most loved
                </span>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-medium text-gray-800 mb-2">Complete Care</h3>
                <div className="text-4xl font-light text-gray-800 mb-1">
                  $297<span className="text-lg text-gray-500">/month</span>
                </div>
                <p className="text-gray-600 mb-8">Full wellness mode activated</p>
                
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center text-gray-700">
                    <div className="w-1.5 h-1.5 bg-teal-400 rounded-full mr-3" />
                    Everything in Essential
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="w-1.5 h-1.5 bg-teal-400 rounded-full mr-3" />
                    Automated brand matching
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="w-1.5 h-1.5 bg-teal-400 rounded-full mr-3" />
                    Outreach automation
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="w-1.5 h-1.5 bg-teal-400 rounded-full mr-3" />
                    Priority support
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="w-1.5 h-1.5 bg-teal-400 rounded-full mr-3" />
                    15+ hours saved weekly
                  </li>
                </ul>
                
                <Link href="/auth/signup" className="block">
                  <WellnessButton variant="primary" className="w-full">
                    Get started
                  </WellnessButton>
                </Link>
              </div>
            </WellnessCard>
          </div>

          <motion.p 
            className="text-center text-gray-500 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            30-day money back guarantee • Cancel anytime
          </motion.p>
        </div>
      </motion.section>

      {/* Testimonial/Trust Section */}
      <motion.section 
        className="py-20 px-4 bg-gradient-to-t from-purple-50/30 to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: scrollProgress > 0.9 ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <WellnessCard glow className="p-12">
            <blockquote className="text-xl md:text-2xl text-gray-700 font-light mb-6 leading-relaxed">
              "I finally have time to actually create content I love. 
              Social Echelon handles everything else – from timing to hashtags to brand deals. 
              My engagement is up 47% and I'm working 5 hours less per day."
            </blockquote>
            <cite className="text-gray-600">
              — Sarah M., Fashion Creator (32K followers)
            </cite>
          </WellnessCard>
        </div>
      </motion.section>

      {/* Final CTA */}
      <motion.section 
        className="py-20 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-light text-gray-800 mb-6">
            Ready to grow without the grind?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join creators who've found balance between ambition and wellbeing
          </p>
          <Link href="/auth/signup">
            <WellnessButton variant="primary" size="lg">
              <Sparkles className="w-5 h-5 mr-2" />
              Begin your journey
            </WellnessButton>
          </Link>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-600">
              © 2024 Social Echelon • Built with care for creators
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/privacy" className="text-gray-600 hover:text-gray-800 transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-gray-600 hover:text-gray-800 transition-colors">
                Terms
              </Link>
              <a href="mailto:hello@socialechelon.com" className="text-gray-600 hover:text-gray-800 transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}