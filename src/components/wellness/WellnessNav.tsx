'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Sparkles,
  TrendingUp,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Heart,
  Moon,
  Sun,
  Coffee
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function WellnessNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('morning')
  const [lastVisit, setLastVisit] = useState<Date | null>(null)
  const [showWelcome, setShowWelcome] = useState(true)

  // Scroll tracking refs
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setTimeOfDay('morning')
    else if (hour < 18) setTimeOfDay('afternoon')
    else setTimeOfDay('evening')

    // Get last visit from localStorage
    const stored = localStorage.getItem('lastVisit')
    if (stored) {
      setLastVisit(new Date(stored))
    }
    localStorage.setItem('lastVisit', new Date().toISOString())

    // Auto-hide welcome message after 5 seconds
    const timer = setTimeout(() => setShowWelcome(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  // Scroll-based show/hide with requestAnimationFrame for performance
  const handleScroll = useCallback(() => {
    if (!ticking.current) {
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY
        const scrollDelta = currentScrollY - lastScrollY.current

        // Show nav when scrolling up or at the top
        if (scrollDelta < -5 || currentScrollY < 50) {
          setIsVisible(true)
        }
        // Hide nav when scrolling down past threshold
        else if (scrollDelta > 5 && currentScrollY > 100) {
          setIsVisible(false)
          setIsOpen(false) // Close mobile menu when hiding
        }

        lastScrollY.current = currentScrollY
        ticking.current = false
      })
      ticking.current = true
    }
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const navItems = [
    { 
      href: '/dashboard', 
      label: 'Wellness Hub', 
      icon: Home,
      color: 'purple'
    },
    { 
      href: '/intelligence', 
      label: 'Creative Space', 
      icon: Sparkles,
      color: 'blue'
    },
    { 
      href: '/trends', 
      label: 'Trend Garden', 
      icon: TrendingUp,
      color: 'green'
    },
    { 
      href: '/dashboard/brand-opportunities', 
      label: 'Partnerships', 
      icon: Users,
      color: 'pink'
    },
    { 
      href: '/settings', 
      label: 'Your Boundaries', 
      icon: Settings,
      color: 'gray'
    }
  ]

  const getTimeIcon = () => {
    switch (timeOfDay) {
      case 'morning': return <Sun className="w-5 h-5 text-yellow-500" />
      case 'afternoon': return <Coffee className="w-5 h-5 text-amber-600" />
      case 'evening': return <Moon className="w-5 h-5 text-indigo-500" />
    }
  }

  const getColorClasses = (color: string, isActive: boolean) => {
    if (isActive) {
      switch (color) {
        case 'purple': return 'bg-purple-100 text-purple-700'
        case 'blue': return 'bg-blue-100 text-blue-700'
        case 'green': return 'bg-green-100 text-green-700'
        case 'pink': return 'bg-pink-100 text-pink-700'
        default: return 'bg-gray-100 text-gray-700'
      }
    }
    return 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
  }

  const getWelcomeMessage = () => {
    if (!lastVisit) return null
    const hours = Math.floor((new Date().getTime() - lastVisit.getTime()) / (1000 * 60 * 60))
    if (hours > 24) {
      return `Welcome back! You've been recharging for ${Math.floor(hours / 24)} days. Your AI handled everything beautifully.`
    } else if (hours > 1) {
      return `You took a ${hours} hour break. Perfect timing for self-care!`
    }
    return null
  }

  const welcomeMessage = getWelcomeMessage()

  return (
    <nav
      className={cn(
        "bg-white/80 backdrop-blur-lg border-b border-gray-100/50 sticky top-0 z-50",
        "transition-transform duration-300 ease-out"
      )}
      style={{
        transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-light text-gray-800">
                Social Echelon
              </span>
            </Link>

            {/* Time-based greeting */}
            <div className="hidden md:flex items-center gap-2 ml-4 px-3 py-1 bg-gray-50 rounded-full">
              {getTimeIcon()}
              <span className="text-sm text-gray-600">
                Good {timeOfDay}
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg",
                    "transition-colors duration-150",
                    getColorClasses(item.color, isActive)
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}

            {/* Logout Button */}
            <button
              onClick={() => {
                document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
                window.location.href = '/'
              }}
              className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors duration-150"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors duration-150"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        className={cn(
          "md:hidden bg-white border-t border-gray-100 overflow-hidden",
          "transition-all duration-300 ease-out",
          isOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 py-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg",
                  "transition-colors duration-150",
                  getColorClasses(item.color, isActive)
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}

          <button
            onClick={() => {
              document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
              window.location.href = '/'
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors duration-150"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Welcome Back Message */}
      {welcomeMessage && showWelcome && (
        <div
          className={cn(
            "bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-2 text-center",
            "transition-all duration-300 ease-out"
          )}
        >
          <p className="text-sm text-gray-600">{welcomeMessage}</p>
        </div>
      )}
    </nav>
  )
}