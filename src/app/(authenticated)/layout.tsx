'use client'

import { CollapsibleNav } from '@/components/wellness/CollapsibleNav'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <CollapsibleNav />
      <main className="min-h-screen pt-20">
        {children}
      </main>
    </>
  )
}