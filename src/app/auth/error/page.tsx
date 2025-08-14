import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function AuthError({ searchParams }: { searchParams: { error?: string } }) {
  const getErrorMessage = (error: string | undefined) => {
    switch (error) {
      case 'instagram_auth_denied':
        return 'Instagram authentication was denied. Please try again and make sure to authorize the application.'
      case 'missing_code':
        return 'Authentication failed due to missing authorization code.'
      case 'authentication_failed':
        return 'Authentication failed. Please try again or contact support if the issue persists.'
      default:
        return 'An unexpected error occurred during authentication. Please try again.'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-4">Authentication Error</h1>
        
        <p className="text-white/80 mb-8 leading-relaxed">
          {getErrorMessage(searchParams.error)}
        </p>
        
        <div className="space-y-4">
          <Link 
            href="/"
            className="block w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300"
          >
            Try Again
          </Link>
          
          <Link 
            href="/"
            className="block w-full border border-white/30 text-white py-3 px-6 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}