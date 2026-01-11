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
  padding = 'md',
  glow = false
}: WellnessCardProps) {
  const paddings = {
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
    xl: 'p-8'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={hover ? { y: -2 } : {}}  // Smaller hover movement
      className={cn(
        'glass-card rounded-2xl',
        hover && 'hover:shadow-lg',  // Removed duplicate transition
        glow && 'wellness-gradient p-[1px]',
        paddings[padding],
        className
      )}
      style={{
        background: glow 
          ? 'linear-gradient(white, white) padding-box, linear-gradient(135deg, rgba(139, 127, 191, 0.2), rgba(94, 205, 195, 0.2)) border-box'
          : undefined
      }}
    >
      {glow ? (
        <div className={cn(
          'glass-card rounded-2xl',
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