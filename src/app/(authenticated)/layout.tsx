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
      <main className="min-h-screen">
        {children}
      </main>
    </>
  )
}