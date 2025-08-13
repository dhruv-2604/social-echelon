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
    disabled:opacity-50 disabled:cursor-not-allowed
  `

  const variants = {
    primary: `
      bg-gradient-to-r from-[var(--wellness-purple)] to-[var(--wellness-purple-soft)]
      text-white shadow-sm hover:shadow-md
      focus:ring-[var(--wellness-purple-soft)]
    `,
    secondary: `
      bg-gradient-to-r from-[var(--wellness-blue)] to-[var(--wellness-blue-soft)]
      text-white shadow-sm hover:shadow-md
      focus:ring-[var(--wellness-blue-soft)]
    `,
    calm: `
      bg-[var(--wellness-neutral-100)] text-[var(--wellness-neutral-700)]
      hover:bg-[var(--wellness-neutral-100)] hover:shadow-sm
      focus:ring-[var(--wellness-neutral-300)]
    `,
    ghost: `
      bg-transparent text-[var(--wellness-neutral-700)]
      hover:bg-[var(--wellness-neutral-100)]
      focus:ring-[var(--wellness-neutral-300)]
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
        className
      )}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </motion.button>
  )
}