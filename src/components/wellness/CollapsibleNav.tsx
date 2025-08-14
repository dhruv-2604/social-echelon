'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

export function CollapsibleNav() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const pathname = usePathname()
  
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Show nav when scrolling up, hide when scrolling down
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false) // Scrolling down
      } else {
        setIsVisible(true) // Scrolling up
      }
      
      setLastScrollY(currentScrollY)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])
  
  const navItems = [
    { href: '/dashboard', label: 'Wellness Hub', icon: <Home className="w-4 h-4" /> },
    { href: '/intelligence', label: 'Creative Space', icon: <Sparkles className="w-4 h-4" /> },
    { href: '/trends', label: 'Trend Garden', icon: <TrendingUp className="w-4 h-4" /> },
    { href: '/dashboard/brand-opportunities', label: 'Partnerships', icon: <Users className="w-4 h-4" /> },
    { href: '/settings', label: 'Boundaries', icon: <Settings className="w-4 h-4" /> },
  ]
  
  return (
    <motion.div 
      className="fixed top-4 w-full z-50 flex justify-center"
      initial={{ y: 0 }}
      animate={{ 
        y: isVisible ? 0 : -100,
        transition: { duration: 0.3, ease: 'easeInOut' }
      }}
    >
      <motion.div
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className="glass-card rounded-full cursor-pointer overflow-hidden"
        animate={{
          width: isExpanded ? '600px' : '180px',
          transition: { 
            duration: 0.4, 
            ease: [0.4, 0, 0.2, 1]
          }
        }}
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 40px rgba(139, 127, 191, 0.1)',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            /* Show Social Echelon when collapsed */
            <motion.div
              key="brand"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-6"
            >
              <span className="font-medium text-gray-800 whitespace-nowrap">Social Echelon</span>
            </motion.div>
          ) : (
            /* Show menu items when expanded */
            <motion.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 px-6"
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                    pathname === item.href
                      ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700'
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.icon}
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                </Link>
              ))}
              
              <div className="w-px h-6 bg-gray-300 mx-2" />
              
              {/* Logout button */}
              <button
                onClick={() => {
                  document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
                  window.location.href = '/'
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-red-50 text-gray-600 hover:text-red-600 transition-all"
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