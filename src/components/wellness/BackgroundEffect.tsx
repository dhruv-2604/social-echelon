'use client'

import { useEffect, useState } from 'react'

export function BackgroundEffect() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) return null
  
  return (
    <>
      {/* Nature background - optimized for performance */}
      <div 
        className="fixed inset-0 z-[-3]"
        style={{
          backgroundImage: `url('https://images.pexels.com/photos/1166209/pexels-photo-1166209.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.4,
          transform: 'translateZ(0)',  // Force GPU acceleration
          backfaceVisibility: 'hidden',  // Prevent flickering
        }}
      />
      
      {/* Subtle white overlay for text readability */}
      <div 
        className="fixed inset-0 z-[-2]"
        style={{
          background: 'rgba(255, 255, 255, 0.5)',  // Semi-transparent white overlay
        }}
      />
      
      {/* Very subtle gradient mesh for color accents */}
      <div 
        className="fixed inset-0 z-[-1] pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 50% 0%, rgba(139, 127, 191, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 0% 50%, rgba(94, 205, 195, 0.06) 0%, transparent 40%),
            radial-gradient(circle at 100% 50%, rgba(255, 214, 98, 0.06) 0%, transparent 40%),
            radial-gradient(circle at 50% 100%, rgba(255, 180, 162, 0.06) 0%, transparent 40%)
          `,
        }}
      />
    </>
  )
}