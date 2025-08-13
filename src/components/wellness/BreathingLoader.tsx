'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface BreathingLoaderProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
}

export function BreathingLoader({ 
  text = "Taking care of things for you", 
  size = 'md' 
}: BreathingLoaderProps) {
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  const dotVariants = {
    initial: { scale: 0.8, opacity: 0.5 },
    animate: { 
      scale: [0.8, 1.2, 0.8],
      opacity: [0.5, 1, 0.5]
    }
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <div className="flex space-x-2">
        {[0, 0.2, 0.4].map((delay, i) => (
          <motion.div
            key={i}
            className={`${sizes[size]} rounded-full bg-gradient-to-r from-[var(--wellness-purple)] to-[var(--wellness-blue)]`}
            variants={dotVariants}
            initial="initial"
            animate="animate"
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
      {text && (
        <motion.p 
          className="text-[var(--wellness-neutral-500)] text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}