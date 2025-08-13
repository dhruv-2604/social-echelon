'use client'

import { useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

export function BackgroundEffect() {
  const [mounted, setMounted] = useState(false)
  const { scrollY } = useScroll()
  
  // Parallax transforms
  const backgroundY = useTransform(scrollY, [0, 1000], [0, -200])
  const backgroundScale = useTransform(scrollY, [0, 1000], [1.1, 1.15])
  const overlayOpacity = useTransform(scrollY, [0, 500], [0.4, 0.6])
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) return null
  
  return (
    <>
      {/* Nature background with parallax */}
      <motion.div
        className="fixed inset-0 z-[-2]"
        style={{
          y: backgroundY,
          scale: backgroundScale,
        }}
      >
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url('https://images.pexels.com/photos/1166209/pexels-photo-1166209.jpeg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(2px) brightness(1.1)',
          }}
        />
        <motion.div 
          className="absolute inset-0"
          style={{
            opacity: overlayOpacity,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
          }}
        />
      </motion.div>
      
      {/* Gradient mesh overlay */}
      <div className="gradient-mesh" />
      
      {/* Top gradient for fading */}
      <div className="gradient-overlay-top" />
      
      {/* Bottom gradient for fading */}
      <div className="gradient-overlay-bottom" />
      
      {/* Additional colorful accents */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div 
          className="absolute top-20 left-10 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139, 127, 191, 0.1) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div 
          className="absolute top-40 right-20 w-80 h-80 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(94, 205, 195, 0.1) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div 
          className="absolute bottom-20 left-1/2 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255, 214, 98, 0.08) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </div>
    </>
  )
}