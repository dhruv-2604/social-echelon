'use client'

import { CollapsibleNav } from '@/components/wellness/CollapsibleNav'
import { useCreatorAuth } from '@/hooks/useAuth'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { loading, isAuthorized } = useCreatorAuth()

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-wellness-sage-soft/30 to-wellness-purple-soft/30">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-wellness-sage/30 border-t-wellness-sage rounded-full animate-spin" />
          <p className="text-wellness-sage font-medium">Loading...</p>
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
      <CollapsibleNav />
      <main className="min-h-screen pt-20">
        {children}
      </main>
    </>
  )
}