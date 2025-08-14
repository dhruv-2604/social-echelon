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
  Sun,
  Moon,
  Coffee,
  Sparkles
} from 'lucide-react'

export function CollapsibleNav() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [icon, setIcon] = useState<React.ReactNode>(null)
  const pathname = usePathname()
  
  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours()
      if (hour < 12) {
        setGreeting('Good morning')
        setIcon(<Sun className="w-4 h-4" />)
      } else if (hour < 17) {
        setGreeting('Good afternoon')
        setIcon(<Coffee className="w-4 h-4" />)
      } else if (hour < 21) {
        setGreeting('Good evening')
        setIcon(<Moon className="w-4 h-4" />)
      } else {
        setGreeting('Good night')
        setIcon(<Sparkles className="w-4 h-4" />)
      }
    }
    
    updateGreeting()
    const interval = setInterval(updateGreeting, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [])
  
  const navItems = [
    { href: '/dashboard', label: 'Wellness Hub', icon: <Home className="w-4 h-4" /> },
    { href: '/intelligence', label: 'Creative Space', icon: <Sparkles className="w-4 h-4" /> },
    { href: '/trends', label: 'Trend Garden', icon: <TrendingUp className="w-4 h-4" /> },
    { href: '/dashboard/brand-opportunities', label: 'Partnerships', icon: <Users className="w-4 h-4" /> },
    { href: '/settings', label: 'Boundaries', icon: <Settings className="w-4 h-4" /> },
  ]
  
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <motion.div
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        initial={false}
        animate={{
          width: isExpanded ? 'auto' : 'auto',
          transition: { duration: 0.3, ease: 'easeInOut' }
        }}
        className="relative"
      >
        <motion.div
          className="glass-card px-6 py-3 rounded-full flex items-center gap-3 cursor-pointer"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 40px rgba(139, 127, 191, 0.1)'
          }}
        >
          {/* Always visible greeting */}
          <div className="flex items-center gap-2 text-gray-700">
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {icon}
            </motion.div>
            <span className="font-light">{greeting}</span>
          </div>
          
          {/* Expandable menu items */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="flex items-center gap-1 overflow-hidden"
              >
                <div className="w-px h-6 bg-gray-300 mx-2" />
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                        pathname === item.href
                          ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700'
                          : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {item.icon}
                      <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                    </Link>
                  </motion.div>
                ))}
                
                {/* Logout button */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: navItems.length * 0.05 }}
                >
                  <button
                    onClick={() => {
                      document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
                      window.location.href = '/'
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-red-50 text-gray-600 hover:text-red-600 transition-all ml-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        {/* Subtle hint on first visit */}
        <AnimatePresence>
          {!isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap"
            >
              Hover for menu
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}