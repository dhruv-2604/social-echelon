'use client'

import { BrandNav } from '@/components/brand/BrandNav'

export default function BrandLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <BrandNav />
      <main className="min-h-screen pt-20">
        {children}
      </main>
    </>
  )
}
