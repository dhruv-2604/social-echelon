'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react'

interface WellnessAlertProps {
  children: React.ReactNode
  variant?: 'success' | 'error' | 'warning' | 'info'
  size?: 'sm' | 'md' | 'lg'
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
  show?: boolean
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
}

const variants = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    iconColor: 'text-green-500'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200', 
    text: 'text-red-800',
    iconColor: 'text-red-500'
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800', 
    iconColor: 'text-yellow-500'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    iconColor: 'text-blue-500'
  }
}

const sizes = {
  sm: 'p-3 text-sm',
  md: 'p-4 text-base',
  lg: 'p-6 text-lg'
}

export function WellnessAlert({
  children,
  variant = 'info',
  size = 'md',
  dismissible = false,
  onDismiss,
  className,
  show = true,
  ...props
}: WellnessAlertProps) {
  const IconComponent = icons[variant]
  const variantStyles = variants[variant]
  
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            'rounded-xl border-2 flex items-start gap-3',
            variantStyles.bg,
            variantStyles.border,
            sizes[size],
            className
          )}
          {...props}
        >
          <IconComponent className={cn('w-5 h-5 flex-shrink-0 mt-0.5', variantStyles.iconColor)} />
          
          <div className={cn('flex-1', variantStyles.text)}>
            {children}
          </div>
          
          {dismissible && onDismiss && (
            <button
              onClick={onDismiss}
              className={cn(
                'flex-shrink-0 p-1 rounded-full transition-colors hover:bg-black/10',
                variantStyles.text
              )}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Helper components for specific use cases
export function WellnessErrorMessage({ children, ...props }: Omit<WellnessAlertProps, 'variant'>) {
  return (
    <WellnessAlert variant="error" size="sm" {...props}>
      {children}
    </WellnessAlert>
  )
}

export function WellnessSuccessMessage({ children, ...props }: Omit<WellnessAlertProps, 'variant'>) {
  return (
    <WellnessAlert variant="success" size="sm" {...props}>
      {children}
    </WellnessAlert>
  )
}

export function WellnessWarningMessage({ children, ...props }: Omit<WellnessAlertProps, 'variant'>) {
  return (
    <WellnessAlert variant="warning" size="sm" {...props}>
      {children}
    </WellnessAlert>
  )
}

export function WellnessInfoMessage({ children, ...props }: Omit<WellnessAlertProps, 'variant'>) {
  return (
    <WellnessAlert variant="info" size="sm" {...props}>
      {children}
    </WellnessAlert>
  )
}