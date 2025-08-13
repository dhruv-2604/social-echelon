'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WellnessCard } from './WellnessCard'
import { WellnessButton } from './WellnessButton'
import { 
  Sparkles, 
  Moon, 
  Sun, 
  Heart,
  TrendingUp,
  Coffee,
  Zap
} from 'lucide-react'

interface WellnessHubProps {
  profile: any
  metrics?: any
}

export function WellnessHub({ profile, metrics }: WellnessHubProps) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const icon = hour < 12 ? <Sun className="w-6 h-6 text-yellow-500" /> : 
                hour < 18 ? <Coffee className="w-6 h-6 text-amber-600" /> : 
                <Moon className="w-6 h-6 text-indigo-500" />

  // Mock data for wellness metrics
  const hoursReclaimed = 18
  const tasksAutomated = 24
  const stressPrevented = 89 // percentage

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--wellness-purple-light)] via-white to-[var(--wellness-blue-light)]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Greeting Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            {icon}
            <h1 className="text-3xl font-light text-[var(--wellness-neutral-700)]">
              {greeting}, <span className="font-medium">{profile?.instagram_username || 'Creator'}</span>
            </h1>
          </div>
          <p className="text-[var(--wellness-neutral-500)] text-lg">
            Your wellness assistant handled everything while you rested
          </p>
        </motion.div>

        {/* Wellness Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <WellnessCard>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[var(--wellness-neutral-500)] text-sm mb-1">Time Reclaimed</p>
                <p className="text-3xl font-light text-[var(--wellness-purple)]">{hoursReclaimed} hrs</p>
                <p className="text-xs text-[var(--wellness-neutral-500)] mt-1">this week</p>
              </div>
              <div className="p-3 bg-[var(--wellness-purple-light)] rounded-full">
                <Zap className="w-5 h-5 text-[var(--wellness-purple)]" />
              </div>
            </div>
          </WellnessCard>

          <WellnessCard>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[var(--wellness-neutral-500)] text-sm mb-1">Tasks Automated</p>
                <p className="text-3xl font-light text-[var(--wellness-blue)]">{tasksAutomated}</p>
                <p className="text-xs text-[var(--wellness-neutral-500)] mt-1">handled by AI</p>
              </div>
              <div className="p-3 bg-[var(--wellness-blue-light)] rounded-full">
                <Sparkles className="w-5 h-5 text-[var(--wellness-blue)]" />
              </div>
            </div>
          </WellnessCard>

          <WellnessCard>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[var(--wellness-neutral-500)] text-sm mb-1">Wellness Score</p>
                <p className="text-3xl font-light text-[var(--wellness-green)]">{stressPrevented}%</p>
                <p className="text-xs text-[var(--wellness-neutral-500)] mt-1">stress reduced</p>
              </div>
              <div className="p-3 bg-[var(--wellness-green-light)] rounded-full">
                <Heart className="w-5 h-5 text-[var(--wellness-green)]" />
              </div>
            </div>
          </WellnessCard>
        </div>

        {/* Today's Summary */}
        <WellnessCard className="mb-8" glow>
          <h2 className="text-xl font-light text-[var(--wellness-neutral-700)] mb-4">
            While you were away...
          </h2>
          <div className="space-y-3">
            <TaskComplete 
              task="3 brand inquiries handled" 
              detail="Responses drafted and ready for review"
            />
            <TaskComplete 
              task="Weekly content plan generated" 
              detail="7 posts optimized for your audience"
            />
            <TaskComplete 
              task="No algorithm changes detected" 
              detail="Your strategy remains effective"
            />
            <TaskComplete 
              task="2 trending topics identified" 
              detail="Relevant to your niche, ready when you are"
            />
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-[var(--wellness-purple-light)] to-[var(--wellness-blue-light)] rounded-xl">
            <p className="text-center text-[var(--wellness-neutral-700)]">
              <span className="font-medium">Your business grew 12%</span> while you took time for yourself 🌱
            </p>
          </div>
        </WellnessCard>

        {/* Action Section */}
        <div className="text-center">
          <p className="text-[var(--wellness-neutral-500)] mb-4">
            Everything is taken care of. Take your time.
          </p>
          <div className="flex gap-4 justify-center">
            <WellnessButton variant="calm" size="lg">
              Review when ready
            </WellnessButton>
            <WellnessButton variant="ghost" size="lg">
              Keep resting
            </WellnessButton>
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskComplete({ task, detail }: { task: string; detail: string }) {
  return (
    <motion.div 
      className="flex items-start gap-3"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mt-1">
        <div className="w-5 h-5 rounded-full bg-[var(--wellness-green-light)] flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <svg className="w-3 h-3 text-[var(--wellness-green)]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </motion.div>
        </div>
      </div>
      <div className="flex-1">
        <p className="text-[var(--wellness-neutral-700)] font-medium">{task}</p>
        <p className="text-[var(--wellness-neutral-500)] text-sm">{detail}</p>
      </div>
    </motion.div>
  )
}