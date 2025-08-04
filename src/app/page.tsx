'use client'

import { Instagram, TrendingUp, Users, Zap, Menu, X, Target, BarChart3, Send } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Navigation */}
      <nav className="px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SE</span>
            </div>
            <span className="text-white font-bold text-xl">Social Echelon</span>
          </div>
          <div className="hidden md:flex space-x-8 text-white/80">
            <Link href="/intelligence" className="hover:text-white transition-colors">Intelligence</Link>
            <Link href="/algorithm" className="hover:text-white transition-colors">Algorithm</Link>
            <Link href="/dashboard/brand-matching" className="hover:text-white transition-colors">Brand Matching</Link>
            <Link href="/dashboard/brand-outreach" className="hover:text-white transition-colors">Outreach</Link>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          
          {/* Mobile menu button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-black/30 backdrop-blur-md mt-4 rounded-lg">
            <div className="flex flex-col space-y-4 p-6">
              <Link 
                href="/intelligence" 
                className="text-white/80 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Intelligence
              </Link>
              <Link 
                href="/algorithm" 
                className="text-white/80 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Algorithm
              </Link>
              <Link 
                href="/dashboard/brand-matching" 
                className="text-white/80 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Brand Matching
              </Link>
              <Link 
                href="/dashboard/brand-outreach" 
                className="text-white/80 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Outreach
              </Link>
              <a 
                href="#features" 
                className="text-white/80 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a 
                href="#pricing" 
                className="text-white/80 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <main className="px-6 pt-20 pb-32">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
            Your AI-Powered
            <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              {" "}Talent Manager
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
            Transform your Instagram presence with AI-driven insights, personalized growth strategies, 
            and automated brand partnerships. Professional talent management for micro-influencers.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Link 
              href="/api/auth/instagram"
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 hover:from-pink-600 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              <Instagram className="w-6 h-6" />
              Connect Instagram & Start Free
            </Link>
            
            <button className="border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all duration-300">
              Watch Demo
            </button>
          </div>
          
          {/* Quick Access Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-12">
            <Link 
              href="/intelligence"
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/20 transition-all duration-300 flex items-center gap-2"
            >
              <TrendingUp className="w-5 h-5" />
              Content Intelligence
            </Link>
            
            <Link 
              href="/algorithm"
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/20 transition-all duration-300 flex items-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Algorithm Detection
            </Link>
            
            <Link 
              href="/dashboard/brand-matching"
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/20 transition-all duration-300 flex items-center gap-2"
            >
              <Target className="w-5 h-5" />
              Brand Matching
            </Link>
            
            <Link 
              href="/dashboard/brand-outreach"
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/20 transition-all duration-300 flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              Outreach Hub
            </Link>
            
            <Link 
              href="/dashboard"
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/20 transition-all duration-300 flex items-center gap-2"
            >
              <BarChart3 className="w-5 h-5" />
              Dashboard
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold text-white mb-2">$2K-5K</div>
              <div className="text-white/70">Traditional talent manager cost/month</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold text-white mb-2">$97-997</div>
              <div className="text-white/70">Our AI-powered solution</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold text-white mb-2">24/7</div>
              <div className="text-white/70">AI availability vs human hours</div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="px-6 py-20 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-16">
            Everything You Need to 
            <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent"> Scale</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <TrendingUp className="w-12 h-12 text-pink-400 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">Growth Analytics</h3>
              <p className="text-white/70 leading-relaxed">
                Real-time insights into follower growth, engagement rates, and content performance with AI-powered recommendations.
              </p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <Zap className="w-12 h-12 text-purple-400 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">AI Content Strategy</h3>
              <p className="text-white/70 leading-relaxed">
                Personalized content ideas, optimal posting times, and hashtag strategies tailored to your niche and audience.
              </p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <Users className="w-12 h-12 text-blue-400 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">Brand Matching</h3>
              <p className="text-white/70 leading-relaxed">
                Automated brand partnership discovery with personalized outreach templates and contract review assistance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-16">
            Choose Your 
            <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">Growth Plan</span>
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Tier */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Growth Starter</h3>
                <div className="text-5xl font-bold text-white mb-2">$97<span className="text-2xl text-white/60">/mo</span></div>
                <p className="text-white/70">Perfect for emerging micro-influencers</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-white/80">
                  <div className="w-2 h-2 bg-pink-400 rounded-full mr-3"></div>
                  AI content strategy & templates
                </li>
                <li className="flex items-center text-white/80">
                  <div className="w-2 h-2 bg-pink-400 rounded-full mr-3"></div>
                  Growth analytics dashboard
                </li>
                <li className="flex items-center text-white/80">
                  <div className="w-2 h-2 bg-pink-400 rounded-full mr-3"></div>
                  Community access
                </li>
                <li className="flex items-center text-white/80">
                  <div className="w-2 h-2 bg-pink-400 rounded-full mr-3"></div>
                  Email support
                </li>
              </ul>
              
              <button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300">
                Start Free Trial
              </button>
            </div>

            {/* Pro Tier */}
            <div className="bg-gradient-to-r from-pink-500/10 to-purple-600/10 backdrop-blur-sm rounded-2xl p-8 border border-pink-400/30 relative">
              <div className="absolute top-4 right-4 bg-gradient-to-r from-pink-400 to-purple-400 text-white px-3 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Pro Manager</h3>
                <div className="text-5xl font-bold text-white mb-2">$997<span className="text-2xl text-white/60">/mo</span></div>
                <p className="text-white/70">Complete talent management solution</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-white/80">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                  Everything in Growth Starter
                </li>
                <li className="flex items-center text-white/80">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                  AI brand matching & outreach
                </li>
                <li className="flex items-center text-white/80">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                  Contract review assistance
                </li>
                <li className="flex items-center text-white/80">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                  Monthly 1:1 strategy calls
                </li>
                <li className="flex items-center text-white/80">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                  Priority support
                </li>
              </ul>
              
              <button className="w-full bg-gradient-to-r from-pink-400 to-purple-500 text-white py-3 rounded-xl font-semibold hover:from-pink-500 hover:to-purple-600 transition-all duration-300">
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center text-white/60">
          <p>&copy; 2024 Social Echelon. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
