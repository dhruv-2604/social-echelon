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
        'glass-card rounded-2xl',
        'transition-all duration-300',
        hover && 'hover:shadow-xl',
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