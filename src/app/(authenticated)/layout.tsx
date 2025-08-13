'use client'

import { WellnessNav } from '@/components/wellness/WellnessNav'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <WellnessNav />
      <main className="min-h-screen bg-gradient-to-br from-purple-50/30 via-white to-blue-50/30">
        {children}
      </main>
    </>
  )
}