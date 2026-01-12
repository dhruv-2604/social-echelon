import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

async function verifyAdmin() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value

  if (!userId) {
    return false
  }

  const supabase = getSupabaseAdmin()
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', userId)
    .single()

  return (profile as { user_type: string } | null)?.user_type === 'admin'
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isAdmin = await verifyAdmin()

  if (!isAdmin) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div>
                <h1 className="font-bold text-lg text-gray-900">Admin Panel</h1>
                <p className="text-xs text-gray-500">Social Echelon</p>
              </div>
            </div>
            <nav className="flex items-center space-x-6">
              <a
                href="/admin/brands"
                className="text-sm text-gray-600 hover:text-purple-600 transition-colors"
              >
                Brands
              </a>
              <a
                href="/admin/dead-letter-queue"
                className="text-sm text-gray-600 hover:text-purple-600 transition-colors"
              >
                Dead Letter Queue
              </a>
              <a
                href="/admin/quick-setup"
                className="text-sm text-gray-600 hover:text-purple-600 transition-colors"
              >
                Quick Setup
              </a>
              <a
                href="/dashboard"
                className="text-sm text-purple-600 hover:text-purple-800 transition-colors"
              >
                Exit Admin
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <main className="max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  )
}
