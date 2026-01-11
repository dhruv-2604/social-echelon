'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  TrendingUp,
  Users,
  Settings,
  LogOut,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Shared easing curve for consistent feel (typed as cubic-bezier tuple)
const smoothEasing: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function CollapsibleNav() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const pathname = usePathname()

  // Scroll tracking refs
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  // Fetch pending opportunities count
  useEffect(() => {
    async function fetchPendingCount() {
      try {
        const res = await fetch('/api/creator/opportunities?status=pending')
        if (res.ok) {
          const data = await res.json()
          setPendingCount(data.counts?.pending || 0)
        }
      } catch (error) {
        // Silently fail - badge just won't show
        console.error('Failed to fetch pending count:', error)
      }
    }
    fetchPendingCount()

    // Refresh every 60 seconds
    const interval = setInterval(fetchPendingCount, 60000)
    return () => clearInterval(interval)
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
          setIsExpanded(false) // Close menu when hiding
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
    { href: '/dashboard', label: 'Wellness Hub', icon: <Home className="w-4 h-4" />, badge: 0 },
    { href: '/intelligence', label: 'Creative Space', icon: <Sparkles className="w-4 h-4" />, badge: 0 },
    { href: '/trends', label: 'Trend Garden', icon: <TrendingUp className="w-4 h-4" />, badge: 0 },
    { href: '/dashboard/brand-opportunities', label: 'Partnerships', icon: <Users className="w-4 h-4" />, badge: pendingCount },
    { href: '/settings', label: 'Boundaries', icon: <Settings className="w-4 h-4" />, badge: 0 },
  ]

  return (
    <motion.div
      className="fixed top-6 w-full z-50 flex justify-center pointer-events-none"
      initial={{ y: 0, opacity: 1 }}
      animate={{
        y: isVisible ? 0 : -100,
        opacity: isVisible ? 1 : 0,
      }}
      transition={{
        ease: smoothEasing,
        duration: 0.45,
      }}
    >
      <motion.div
        layout
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={cn(
          "pointer-events-auto cursor-pointer rounded-full flex items-center justify-center h-12 relative overflow-hidden",
          "will-change-transform"
        )}
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 40px rgba(139, 127, 191, 0.1)',
        }}
        transition={{
          layout: {
            ease: smoothEasing,
            duration: 0.45,
          },
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {!isExpanded ? (
            // Collapsed state - Social Echelon brand
            <motion.div
              key="collapsed"
              className="flex items-center justify-center px-6 relative"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                ease: smoothEasing,
                duration: 0.35,
              }}
            >
              <span
                className="font-medium text-gray-800 whitespace-nowrap text-lg tracking-tight font-sans"
                style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
              >
                Social Echelon
              </span>
              {/* Show small badge indicator when collapsed */}
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              )}
            </motion.div>
          ) : (
            // Expanded state - Navigation menu
            <motion.div
              key="expanded"
              className="flex items-center gap-1 px-4"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{
                ease: smoothEasing,
                duration: 0.35,
              }}
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-2 px-3 py-1.5 rounded-full",
                    "transition-colors duration-150",
                    pathname === item.href
                      ? "bg-purple-50 text-purple-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  {item.icon}
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-purple-500 text-white text-[10px] font-bold rounded-full">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              ))}

              <div className="w-px h-5 bg-gray-200 mx-2" />

              {/* Logout button */}
              <button
                onClick={() => {
                  document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
                  window.location.href = '/'
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors duration-150"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
