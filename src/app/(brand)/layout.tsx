'use client'

import { BrandNav } from '@/components/brand/BrandNav'
import { useBrandAuth } from '@/hooks/useAuth'

export default function BrandLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { loading, isAuthorized } = useBrandAuth()

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-purple-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render content if not authorized (redirect will happen automatically)
  if (!isAuthorized) {
    return null
  }

  return (
    <>
      <BrandNav />
      <main className="min-h-screen pt-20">
        {children}
      </main>
    </>
  )
}
