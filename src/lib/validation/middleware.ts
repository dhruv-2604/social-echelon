import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRequest, validateQueryParams, validatePathParams } from './schemas'

// Route context type for Next.js 15 - params is always a Promise now
type RouteContext = { params: Promise<Record<string, string>> }

// Next.js 15 route handler type
type RouteHandler = (
  request: NextRequest,
  context: RouteContext
) => Promise<NextResponse> | NextResponse

// Generic validation middleware for API routes
export function withValidation<TBody = any, TQuery = any, TParams = any>(
  options: {
    body?: z.ZodSchema<TBody>
    query?: z.ZodSchema<TQuery>
    params?: z.ZodSchema<TParams>
  }
) {
  return function validationMiddleware(
    handler: (
      request: NextRequest,
      context: {
        validatedBody?: TBody
        validatedQuery?: TQuery
        validatedParams?: TParams
        params?: any
      }
    ) => Promise<NextResponse>
  ): RouteHandler {
    return async function validatedHandler(
      request: NextRequest,
      context: RouteContext
    ): Promise<NextResponse> {
      try {
        const validationContext: {
          validatedBody?: TBody
          validatedQuery?: TQuery
          validatedParams?: TParams
          params?: any
        } = {}

        // Validate request body for POST/PATCH requests
        if (options.body && (request.method === 'POST' || request.method === 'PATCH' || request.method === 'PUT')) {
          try {
            const body = await request.json()
            const bodyValidation = validateRequest(options.body, body, 'request body')
            
            if (!bodyValidation.success) {
              return NextResponse.json(
                {
                  error: bodyValidation.error,
                  details: bodyValidation.details
                },
                { status: 400 }
              )
            }
            
            validationContext.validatedBody = bodyValidation.data
          } catch (error) {
            return NextResponse.json(
              { error: 'Invalid JSON in request body' },
              { status: 400 }
            )
          }
        }

        // Validate query parameters
        if (options.query) {
          const queryValidation = validateQueryParams(options.query, request.nextUrl.searchParams)
          
          if (!queryValidation.success) {
            return NextResponse.json(
              {
                error: queryValidation.error,
                details: queryValidation.details
              },
              { status: 400 }
            )
          }
          
          validationContext.validatedQuery = queryValidation.data
        }

        // Validate path parameters
        if (options.params && context.params) {
          const resolvedParams = await context.params
          const paramsValidation = validatePathParams(options.params, resolvedParams)

          if (!paramsValidation.success) {
            return NextResponse.json(
              {
                error: paramsValidation.error,
                details: paramsValidation.details
              },
              { status: 400 }
            )
          }

          validationContext.validatedParams = paramsValidation.data
        }

        // Pass along original params for backward compatibility
        if (context.params) {
          validationContext.params = await context.params
        }

        // Call the original handler with validated data
        return await handler(request, validationContext)
        
      } catch (error) {
        console.error('Validation middleware error:', error)
        return NextResponse.json(
          { error: 'Request validation failed' },
          { status: 500 }
        )
      }
    }
  }
}

// Auth validation helper
export function requireAuth(handler: (request: NextRequest, userId: string, context?: any) => Promise<NextResponse>): RouteHandler {
  return async function authHandler(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const userId = cookieStore.get('user_id')?.value

      if (!userId) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }

      // Basic userId validation to prevent injection
      if (!/^[a-zA-Z0-9-_]+$/.test(userId)) {
        return NextResponse.json({ error: 'Invalid user session' }, { status: 401 })
      }

      return await handler(request, userId, context)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
    }
  }
}

// Combined auth + validation middleware
export function withAuthAndValidation<TBody = any, TQuery = any, TParams = any>(
  options: {
    body?: z.ZodSchema<TBody>
    query?: z.ZodSchema<TQuery>
    params?: z.ZodSchema<TParams>
  }
) {
  return function authValidationMiddleware(
    handler: (
      request: NextRequest,
      userId: string,
      context: {
        validatedBody?: TBody
        validatedQuery?: TQuery
        validatedParams?: TParams
        params?: any
      }
    ) => Promise<NextResponse>
  ): RouteHandler {
    return async function combinedHandler(
      request: NextRequest,
      context: RouteContext
    ): Promise<NextResponse> {
      try {
        // Auth check
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const userId = cookieStore.get('user_id')?.value

        if (!userId) {
          return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        if (!/^[a-zA-Z0-9-_]+$/.test(userId)) {
          return NextResponse.json({ error: 'Invalid user session' }, { status: 401 })
        }

        // Validation
        const validationContext: {
          validatedBody?: TBody
          validatedQuery?: TQuery
          validatedParams?: TParams
          params?: any
        } = {}

        // Validate body
        if (options.body && (request.method === 'POST' || request.method === 'PATCH' || request.method === 'PUT')) {
          try {
            const body = await request.json()
            const bodyValidation = validateRequest(options.body, body, 'request body')

            if (!bodyValidation.success) {
              return NextResponse.json(
                { error: bodyValidation.error, details: bodyValidation.details },
                { status: 400 }
              )
            }
            validationContext.validatedBody = bodyValidation.data
          } catch {
            return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
          }
        }

        // Validate query
        if (options.query) {
          const queryValidation = validateQueryParams(options.query, request.nextUrl.searchParams)
          if (!queryValidation.success) {
            return NextResponse.json(
              { error: queryValidation.error, details: queryValidation.details },
              { status: 400 }
            )
          }
          validationContext.validatedQuery = queryValidation.data
        }

        // Validate params
        if (options.params && context.params) {
          const resolvedParams = await context.params
          const paramsValidation = validatePathParams(options.params, resolvedParams)
          if (!paramsValidation.success) {
            return NextResponse.json(
              { error: paramsValidation.error, details: paramsValidation.details },
              { status: 400 }
            )
          }
          validationContext.validatedParams = paramsValidation.data
        }

        if (context.params) {
          validationContext.params = await context.params
        }

        return await handler(request, userId, validationContext)
      } catch (error) {
        console.error('Auth/validation middleware error:', error)
        return NextResponse.json({ error: 'Request processing failed' }, { status: 500 })
      }
    }
  }
}

// Rate limiting helper (basic implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(maxRequests: number, windowMs: number) {
  return function rateLimitMiddleware(
    handler: RouteHandler
  ): RouteHandler {
    return async function rateLimitedHandler(request: NextRequest, context: RouteContext): Promise<NextResponse> {
      try {
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const userId = cookieStore.get('user_id')?.value
        const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        
        // Use userId if available, otherwise fall back to IP
        const identifier = userId || clientIP
        const now = Date.now()
        const windowStart = now - windowMs
        
        const requestData = requestCounts.get(identifier)
        
        if (requestData && requestData.resetTime > now) {
          // Within the current window
          if (requestData.count >= maxRequests) {
            return NextResponse.json(
              { 
                error: 'Rate limit exceeded',
                retryAfter: Math.ceil((requestData.resetTime - now) / 1000)
              },
              { status: 429 }
            )
          }
          requestData.count++
        } else {
          // New window
          requestCounts.set(identifier, {
            count: 1,
            resetTime: now + windowMs
          })
        }
        
        return await handler(request, context)
      } catch (error) {
        console.error('Rate limit middleware error:', error)
        return await handler(request, context) // Continue without rate limiting on error
      }
    }
  }
}

// Security headers middleware
export function withSecurityHeaders(
  handler: RouteHandler
): RouteHandler {
  return async function securityHandler(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    const response = await handler(request, context)

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    return response
  }
}

// User type validation - ensures user has required type (creator, brand, admin)
type UserType = 'creator' | 'brand' | 'admin'

export function requireUserType(
  allowedTypes: UserType | UserType[]
) {
  const types = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes]

  return function userTypeMiddleware(
    handler: (
      request: NextRequest,
      userId: string,
      userType: UserType,
      context?: any
    ) => Promise<NextResponse>
  ): RouteHandler {
    return async function userTypeHandler(
      request: NextRequest,
      context: RouteContext
    ): Promise<NextResponse> {
      try {
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const userId = cookieStore.get('user_id')?.value

        if (!userId) {
          return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Basic userId validation
        if (!/^[a-zA-Z0-9-_]+$/.test(userId)) {
          return NextResponse.json({ error: 'Invalid user session' }, { status: 401 })
        }

        // First check the cookie for user_type (fast path)
        let userType = cookieStore.get('user_type')?.value as UserType | undefined

        // If not in cookie or not valid, fetch from database
        if (!userType || !['creator', 'brand', 'admin'].includes(userType)) {
          const { getSupabaseAdmin } = await import('@/lib/supabase-admin')
          const supabase = getSupabaseAdmin()

          const { data: profile, error } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', userId)
            .single()

          if (error || !profile) {
            return NextResponse.json({ error: 'User not found' }, { status: 401 })
          }

          userType = (profile.user_type || 'creator') as UserType
        }

        // Check if user type is allowed
        if (!types.includes(userType)) {
          return NextResponse.json(
            {
              error: 'Access denied',
              message: `This action requires ${types.join(' or ')} account type`
            },
            { status: 403 }
          )
        }

        return await handler(request, userId, userType, context)
      } catch (error) {
        console.error('User type middleware error:', error)
        return NextResponse.json({ error: 'Authorization failed' }, { status: 500 })
      }
    }
  }
}

// Combined user type + validation middleware
export function withUserTypeAndValidation<TBody = any, TQuery = any, TParams = any>(
  allowedTypes: UserType | UserType[],
  options: {
    body?: z.ZodSchema<TBody>
    query?: z.ZodSchema<TQuery>
    params?: z.ZodSchema<TParams>
  }
) {
  const types = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes]

  return function userTypeValidationMiddleware(
    handler: (
      request: NextRequest,
      userId: string,
      userType: UserType,
      context: {
        validatedBody?: TBody
        validatedQuery?: TQuery
        validatedParams?: TParams
        params?: any
      }
    ) => Promise<NextResponse>
  ): RouteHandler {
    return async function combinedHandler(
      request: NextRequest,
      context: RouteContext
    ): Promise<NextResponse> {
      try {
        // Auth check
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const userId = cookieStore.get('user_id')?.value

        if (!userId) {
          return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        if (!/^[a-zA-Z0-9-_]+$/.test(userId)) {
          return NextResponse.json({ error: 'Invalid user session' }, { status: 401 })
        }

        // Get user type
        let userType = cookieStore.get('user_type')?.value as UserType | undefined

        if (!userType || !['creator', 'brand', 'admin'].includes(userType)) {
          const { getSupabaseAdmin } = await import('@/lib/supabase-admin')
          const supabase = getSupabaseAdmin()

          const { data: profile, error } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', userId)
            .single()

          if (error || !profile) {
            return NextResponse.json({ error: 'User not found' }, { status: 401 })
          }

          userType = (profile.user_type || 'creator') as UserType
        }

        // Check user type
        if (!types.includes(userType)) {
          return NextResponse.json(
            {
              error: 'Access denied',
              message: `This action requires ${types.join(' or ')} account type`
            },
            { status: 403 }
          )
        }

        // Validation
        const validationContext: {
          validatedBody?: TBody
          validatedQuery?: TQuery
          validatedParams?: TParams
          params?: any
        } = {}

        // Validate body
        if (options.body && (request.method === 'POST' || request.method === 'PATCH' || request.method === 'PUT')) {
          try {
            const body = await request.json()
            const bodyValidation = validateRequest(options.body, body, 'request body')

            if (!bodyValidation.success) {
              return NextResponse.json(
                { error: bodyValidation.error, details: bodyValidation.details },
                { status: 400 }
              )
            }
            validationContext.validatedBody = bodyValidation.data
          } catch {
            return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
          }
        }

        // Validate query
        if (options.query) {
          const queryValidation = validateQueryParams(options.query, request.nextUrl.searchParams)
          if (!queryValidation.success) {
            return NextResponse.json(
              { error: queryValidation.error, details: queryValidation.details },
              { status: 400 }
            )
          }
          validationContext.validatedQuery = queryValidation.data
        }

        // Validate params
        if (options.params && context.params) {
          const resolvedParams = await context.params
          const paramsValidation = validatePathParams(options.params, resolvedParams)
          if (!paramsValidation.success) {
            return NextResponse.json(
              { error: paramsValidation.error, details: paramsValidation.details },
              { status: 400 }
            )
          }
          validationContext.validatedParams = paramsValidation.data
        }

        if (context.params) {
          validationContext.params = await context.params
        }

        return await handler(request, userId, userType, validationContext)
      } catch (error) {
        console.error('User type/validation middleware error:', error)
        return NextResponse.json({ error: 'Request processing failed' }, { status: 500 })
      }
    }
  }
}