'use client'

import React, { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface WellnessInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  helper?: string
  variant?: 'default' | 'search' | 'minimal'
  size?: 'sm' | 'md' | 'lg'
}

export const WellnessInput = forwardRef<HTMLInputElement, WellnessInputProps>(
  ({ 
    label, 
    error, 
    helper, 
    variant = 'default', 
    size = 'md',
    className, 
    ...props 
  }, ref) => {
    const baseStyles = `
      w-full rounded-xl border-2 transition-all duration-300
      focus:outline-none focus:ring-4
      placeholder:text-gray-400
      disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
    `

    const variants = {
      default: `
        border-gray-200 bg-white
        focus:border-purple-500 focus:ring-purple-100
        hover:border-gray-300
      `,
      search: `
        border-gray-200 bg-gray-50
        focus:border-purple-500 focus:ring-purple-100 focus:bg-white
        hover:border-gray-300
      `,
      minimal: `
        border-transparent bg-gray-50
        focus:border-purple-500 focus:ring-purple-100 focus:bg-white
        hover:bg-gray-100
      `
    }

    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-6 py-4 text-lg'
    }

    const errorStyles = error 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
      : ''

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-2"
      >
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <input
            ref={ref}
            className={cn(
              baseStyles,
              variants[variant],
              sizes[size],
              errorStyles,
              className
            )}
            {...props}
          />
          
          {/* Focus ring animation */}
          <motion.div
            className="absolute inset-0 rounded-xl border-2 border-purple-400 opacity-0 pointer-events-none"
            whileFocus={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        </div>

        {/* Helper text or error message */}
        {(helper || error) && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'text-sm',
              error ? 'text-red-600' : 'text-gray-500'
            )}
          >
            {error || helper}
          </motion.div>
        )}
      </motion.div>
    )
  }
)

WellnessInput.displayName = 'WellnessInput'