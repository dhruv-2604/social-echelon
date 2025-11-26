'use client'

import React, { useState } from 'react'
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
import { cn } from '@/lib/utils'

export function CollapsibleNav() {
  const [isExpanded, setIsExpanded] = useState(false)
  const pathname = usePathname()
  
  const navItems = [
    { href: '/dashboard', label: 'Wellness Hub', icon: <Home className="w-4 h-4" /> },
    { href: '/intelligence', label: 'Creative Space', icon: <Sparkles className="w-4 h-4" /> },
    { href: '/trends', label: 'Trend Garden', icon: <TrendingUp className="w-4 h-4" /> },
    { href: '/dashboard/brand-opportunities', label: 'Partnerships', icon: <Users className="w-4 h-4" /> },
    { href: '/settings', label: 'Boundaries', icon: <Settings className="w-4 h-4" /> },
  ]
  
  return (
    <motion.div 
      className="fixed top-6 w-full z-50 flex justify-center pointer-events-none"
      initial={{ y: 0, opacity: 0 }}
      animate={{ 
        y: 0,
        opacity: 1,
        transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
      }}
    >
      <motion.div
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={cn(
          "pointer-events-auto cursor-pointer rounded-full",
          "bg-white/90 backdrop-blur-md border border-white/50",
          "shadow-wellness-lg hover:shadow-wellness-xl transition-shadow duration-300",
          "flex items-center justify-center h-14 overflow-hidden min-w-[180px]"
        )}
        initial={false}
        animate={{
          width: isExpanded ? 'auto' : '180px',
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30
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
              className="px-6 absolute inset-0 flex items-center justify-center"
            >
              <span className="font-display font-medium text-wellness-neutral-800 whitespace-nowrap text-lg tracking-tight">
                Social Echelon
              </span>
            </motion.div>
          ) : (
            /* Show menu items when expanded */
            <motion.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="flex items-center gap-1 px-4"
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200",
                    pathname === item.href
                      ? "bg-wellness-purple-light text-wellness-purple"
                      : "text-wellness-neutral-600 hover:bg-wellness-neutral-100 hover:text-wellness-neutral-900"
                  )}
                >
                  {item.icon}
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                </Link>
              ))}
              
              <div className="w-px h-5 bg-wellness-neutral-200 mx-2" />
              
              {/* Logout button */}
              <button
                onClick={() => {
                  document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
                  window.location.href = '/'
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-wellness-coral-light text-wellness-neutral-600 hover:text-wellness-coral transition-all duration-200"
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