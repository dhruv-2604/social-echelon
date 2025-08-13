'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface WellnessCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg' | 'xl'
  glow?: boolean
}

export function WellnessCard({
  children,
  className,
  hover = true,
  padding = 'lg',
  glow = false
}: WellnessCardProps) {
  const paddings = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={hover ? { y: -4 } : {}}
      className={cn(
        'bg-white rounded-2xl shadow-sm',
        'border border-gray-100/50',
        'transition-all duration-300',
        hover && 'hover:shadow-lg',
        glow && 'wellness-gradient p-[1px]',
        paddings[padding],
        className
      )}
    >
      {glow ? (
        <div className={cn(
          'bg-white rounded-2xl',
          paddings[padding]
        )}>
          {children}
        </div>
      ) : (
        children
      )}
    </motion.div>
  )
}