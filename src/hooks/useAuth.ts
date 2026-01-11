import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type UserType = 'creator' | 'brand' | 'admin'

interface User {
  id: string
  email?: string
  instagram_username?: string
  user_type?: UserType
}

interface UseAuthOptions {
  requiredUserType?: UserType
  redirectTo?: string
}

export function useAuth(options?: UseAuthOptions) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/user/profile')
        if (!response.ok) {
          // Not authenticated - redirect to login
          if (options?.redirectTo !== undefined) {
            router.push(options.redirectTo || '/auth/login')
          } else {
            router.push('/auth/login')
          }
          setLoading(false)
          return
        }

        const data = await response.json()
        if (data.profile) {
          const userData: User = {
            id: data.profile.id,
            email: data.profile.email,
            instagram_username: data.profile.instagram_username,
            user_type: data.profile.user_type || 'creator'
          }
          setUser(userData)

          // Check user type authorization
          if (options?.requiredUserType && userData.user_type !== options.requiredUserType) {
            // Wrong user type - redirect to appropriate dashboard
            const redirectPath = userData.user_type === 'brand'
              ? '/brand/dashboard'
              : '/dashboard'
            router.push(redirectPath)
            setIsAuthorized(false)
          } else {
            setIsAuthorized(true)
          }
        } else {
          // No profile found
          router.push('/auth/login')
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [router, options?.requiredUserType, options?.redirectTo])

  return { user, loading, isAuthorized }
}

// Convenience hooks for specific user types
export function useBrandAuth() {
  return useAuth({ requiredUserType: 'brand' })
}

export function useCreatorAuth() {
  return useAuth({ requiredUserType: 'creator' })
}