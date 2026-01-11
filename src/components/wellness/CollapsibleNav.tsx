'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  TrendingUp,
  Users,
  Settings,
  LogOut,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <div
      className={cn(
        "fixed top-6 w-full z-50 flex justify-center pointer-events-none"
      )}
      style={{
        transform: isVisible ? 'translateY(0)' : 'translateY(-100px)',
        opacity: isVisible ? 1 : 0,
        transition: 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms ease-in-out',
      }}
    >
      <div
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={cn(
          "pointer-events-auto cursor-pointer rounded-full flex items-center justify-center h-12",
          "will-change-[width]"
        )}
        style={{
          width: isExpanded ? 'auto' : '180px',
          minWidth: '180px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 40px rgba(139, 127, 191, 0.1)',
          transition: 'width 450ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Collapsed state - Social Echelon brand */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center px-6",
            isExpanded ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
          )}
          style={{
            transition: 'opacity 350ms ease-in-out, transform 350ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <span
            className="font-medium text-gray-800 whitespace-nowrap text-lg tracking-tight"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Social Echelon
          </span>
          {/* Show small badge indicator when collapsed */}
          {pendingCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
          )}
        </div>

        {/* Expanded state - Navigation menu */}
        <div
          className={cn(
            "flex items-center gap-1 px-4",
            isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"
          )}
          style={{
            transition: 'opacity 350ms ease-in-out, transform 350ms cubic-bezier(0.16, 1, 0.3, 1)',
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
        </div>
      </div>
    </div>
  )
}
