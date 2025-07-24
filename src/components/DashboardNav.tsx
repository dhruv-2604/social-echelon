'use client'

import { Instagram } from 'lucide-react'
import AlertBell from '@/components/alerts/alert-bell'
import { usePathname } from 'next/navigation'

interface DashboardNavProps {
  profile?: {
    instagram_username: string
    full_name: string
    avatar_url: string
  }
}

export default function DashboardNav({ profile }: DashboardNavProps) {
  const pathname = usePathname()
  
  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/intelligence', label: 'Intelligence' },
    { href: '/algorithm', label: 'Algorithm' },
    { href: '/dashboard/brand-opportunities', label: 'Brand Matching' },
    { href: '/dashboard/brand-outreach', label: 'Outreach' },
    { href: '/trends', label: 'Trends' }
  ]
  
  return (
    <nav className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SE</span>
            </div>
            <span className="font-bold text-xl text-gray-900">Social Echelon</span>
          </div>
          
          <div className="flex items-center space-x-6">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'text-purple-600'
                    : 'text-gray-600 hover:text-purple-600'
                }`}
              >
                {item.label}
              </a>
            ))}
            
            <AlertBell />
            
            {profile && (
              <>
                <div className="flex items-center space-x-2">
                  <Instagram className="w-5 h-5 text-pink-500" />
                  <span className="text-sm text-gray-600">@{profile.instagram_username}</span>
                </div>
                <a href="/settings" className="cursor-pointer">
                  <img 
                    src={profile.avatar_url || '/default-avatar.png'} 
                    alt={profile.full_name || 'Profile'} 
                    className="w-8 h-8 rounded-full object-cover hover:ring-2 hover:ring-purple-500 transition-all"
                    onError={(e) => {
                      e.currentTarget.src = '/default-avatar.png'
                    }}
                  />
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}