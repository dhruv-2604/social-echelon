'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  Building2,
  Handshake
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function BrandNav() {
  const [isExpanded, setIsExpanded] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { href: '/brand/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { href: '/brand/dashboard/briefs', label: 'Briefs', icon: <FileText className="w-4 h-4" /> },
    { href: '/brand/dashboard/partnerships', label: 'Partnerships', icon: <Handshake className="w-4 h-4" /> },
    { href: '/brand/dashboard/messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
    { href: '/brand/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
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
        className="pointer-events-auto cursor-pointer rounded-full flex items-center justify-center h-12 overflow-hidden"
        initial={false}
        animate={{
          width: isExpanded ? 'auto' : '180px',
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
          minWidth: '180px'
        }}
      >
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            <motion.div
              key="brand"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="px-6 absolute inset-0 flex items-center justify-center gap-2"
            >
              <Building2 className="w-4 h-4 text-purple-600" />
              <span className="font-display font-medium text-wellness-neutral-800 whitespace-nowrap text-lg tracking-tight">
                Brand Portal
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1 px-4"
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200",
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? "bg-purple-50 text-purple-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  {item.icon}
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                </Link>
              ))}

              <div className="w-px h-5 bg-gray-200 mx-2" />

              <button
                onClick={() => {
                  document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
                  document.cookie = 'user_type=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
                  window.location.href = '/'
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-red-50 text-gray-600 hover:text-red-600 transition-all duration-200"
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
