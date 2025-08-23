'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WellnessCard } from '@/components/wellness/WellnessCard'
import { WellnessButton } from '@/components/wellness/WellnessButton'

export default function AdminQuickSetup() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    instagramUsername: ''
  })
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await fetch('/api/admin/create-profile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-secret': 'admin' // In production, use a real secret
        },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('Profile created! Redirecting to dashboard...')
        router.push('/dashboard')
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Failed to create profile')
    }
    
    setLoading(false)
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center p-4">
      <WellnessCard className="max-w-md w-full p-8">
        <h1 className="text-2xl font-light text-gray-800 mb-6">Admin Quick Setup</h1>
        <p className="text-gray-600 mb-6">
          Bypass payment and create your profile instantly
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-purple-400 focus:outline-none"
              placeholder="your@email.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-purple-400 focus:outline-none"
              placeholder="Strong password"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instagram Username
            </label>
            <input
              type="text"
              required
              value={formData.instagramUsername}
              onChange={(e) => setFormData({...formData, instagramUsername: e.target.value})}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-purple-400 focus:outline-none"
              placeholder="@yourusername"
            />
          </div>
          
          <WellnessButton
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Profile & Login'}
          </WellnessButton>
        </form>
        
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This bypasses payment and gives you Harmony plan (highest tier) immediately.
          </p>
        </div>
      </WellnessCard>
    </div>
  )
}