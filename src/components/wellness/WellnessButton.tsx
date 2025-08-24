'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface WellnessButtonProps {
  variant?: 'primary' | 'secondary' | 'calm' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  wellness?: boolean // Enable wellness animations
  children: React.ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export function WellnessButton({
  variant = 'primary',
  size = 'md',
  wellness = true,
  className,
  children,
  disabled,
  onClick,
  type = 'button'
}: WellnessButtonProps) {
  const baseStyles = `
    font-medium rounded-xl transition-all duration-300
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
    disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none
  `

  const variants = {
    primary: `
      bg-gradient-to-r from-[#9333ea] to-[#a855f7]
      text-white shadow-sm hover:shadow-md hover:from-[#7c3aed] hover:to-[#9333ea]
      focus:ring-[#9333ea]/30 focus:ring-4
      disabled:from-gray-300 disabled:to-gray-300
    `,
    secondary: `
      bg-gradient-to-r from-[#10b981] to-[#059669]
      text-white shadow-sm hover:shadow-md hover:from-[#059669] hover:to-[#047857]
      focus:ring-[#10b981]/30 focus:ring-4
      disabled:from-gray-300 disabled:to-gray-300
    `,
    calm: `
      bg-gray-100 text-gray-700 border border-gray-200
      hover:bg-gray-200 hover:shadow-sm hover:border-gray-300
      focus:ring-[#9333ea]/20 focus:border-[#9333ea]
      disabled:bg-gray-100 disabled:border-gray-200
    `,
    ghost: `
      bg-transparent text-gray-700 hover:bg-gray-100
      focus:ring-[#9333ea]/20
      disabled:bg-transparent disabled:text-gray-400
    `
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  }

  return (
    <motion.button
      whileHover={wellness && !disabled ? { scale: 1.02 } : {}}
      whileTap={wellness && !disabled ? { scale: 0.98 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        disabled && 'disabled:hover:shadow-none disabled:hover:scale-100',
        className
      )}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      type={type}
      aria-disabled={disabled}
    >
      <span className={disabled ? 'opacity-60' : 'opacity-100'}>
        {children}
      </span>
    </motion.button>
  )
}