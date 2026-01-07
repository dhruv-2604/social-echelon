import { z } from 'zod'

// Common validation patterns
export const sanitizeString = (str: string): string => {
  return str
    .replace(/[<>'"&]/g, '') // Remove potential XSS characters
    .trim()
    .slice(0, 1000) // Limit length to prevent DoS
}

export const validateAndSanitizeString = z.string()
  .min(1, "Field cannot be empty")
  .max(1000, "Field too long")
  .transform(sanitizeString)

export const validateOptionalString = z.string()
  .max(1000, "Field too long")
  .optional()
  .transform((val) => val ? sanitizeString(val) : val)

export const validateEmail = z.string()
  .email("Invalid email format")
  .max(254, "Email too long")
  .transform(sanitizeString)

export const validateUsername = z.string()
  .min(1, "Username is required")
  .max(30, "Username too long")
  .regex(/^[a-zA-Z0-9_.]+$/, "Username contains invalid characters")
  .transform(sanitizeString)

export const validateNiche = z.string()
  .min(1, "Niche is required")
  .max(50, "Niche name too long")
  .regex(/^[a-zA-Z0-9\s-_]+$/, "Niche contains invalid characters")
  .transform(sanitizeString)

export const validateInteger = z.number()
  .int("Must be an integer")
  .min(0, "Cannot be negative")
  .max(1000000, "Value too large")

export const validatePositiveInteger = z.number()
  .int("Must be an integer")
  .min(1, "Must be positive")
  .max(1000000, "Value too large")

export const validatePercentage = z.number()
  .min(0, "Percentage cannot be negative")
  .max(100, "Percentage cannot exceed 100")

// Content generation validation
export const ContentPlanSchema = z.object({
  niche: validateOptionalString,
  primary_goal: z.enum(['growth', 'engagement', 'sales', 'awareness', 'community']).optional(),
  content_style: z.enum(['authentic', 'professional', 'casual', 'educational', 'entertaining']).optional(),
  target_audience: validateOptionalString,
  voice_tone: z.enum(['casual', 'professional', 'friendly', 'authoritative', 'playful']).optional(),
  posting_frequency: z.number()
    .int("Posting frequency must be an integer")
    .min(1, "Must post at least once per week")
    .max(21, "Cannot post more than 3 times per day")
    .optional()
})

// User profile validation
export const UserProfileUpdateSchema = z.object({
  full_name: validateOptionalString,
  email: validateEmail.optional(),
  bio: validateOptionalString,
  location: validateOptionalString,
  website: z.string()
    .url("Invalid website URL")
    .max(500, "URL too long")
    .optional()
    .or(z.literal(''))
})

// Queue job validation
export const JobEnqueueSchema = z.object({
  type: z.enum([
    'collect_metrics',
    'analyze_posts',
    'generate_insights',
    'update_trends',
    'brand_matching',
    'content_generation'
  ], {
    errorMap: () => ({ message: "Invalid job type" })
  }),
  payload: z.record(z.any()).optional(),
  priority: z.number()
    .int("Priority must be an integer")
    .min(1, "Priority must be at least 1")
    .max(10, "Priority cannot exceed 10")
    .default(5)
})

// Trends validation
export const TrendsQuerySchema = z.object({
  niche: validateNiche,
  minConfidence: z.number()
    .int("Min confidence must be an integer")
    .min(0, "Min confidence cannot be negative")
    .max(100, "Min confidence cannot exceed 100")
    .default(60),
  type: z.enum(['hashtag', 'topic', 'format', 'audio']).optional()
})

export const TrendingHashtagsSchema = z.object({
  niche: validateNiche,
  limit: z.number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(50, "Limit cannot exceed 50")
    .default(10)
})

// Brand matching validation
export const BrandMatchingQuerySchema = z.object({
  limit: z.number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(100),
  minScore: z.number()
    .int("Min score must be an integer")
    .min(0, "Min score cannot be negative")
    .max(100, "Min score cannot exceed 100")
    .default(50),
  excludeMatched: z.boolean().default(false)
})

// Brand onboarding validation
export const BrandOnboardingSchema = z.object({
  identity: z.object({
    values: z.array(validateAndSanitizeString).min(1, "At least one value required").max(10, "Too many values"),
    mission: validateAndSanitizeString,
    target_demographic: validateAndSanitizeString,
    brand_personality: z.array(validateAndSanitizeString).min(1, "At least one personality trait required").max(10, "Too many traits")
  }),
  preferences: z.object({
    collaboration_types: z.array(z.enum(['sponsored_post', 'product_placement', 'brand_ambassador', 'event_collaboration', 'content_creation'])).min(1, "At least one collaboration type required"),
    budget_range: z.enum(['micro', 'small', 'medium', 'large']),
    content_themes: z.array(validateAndSanitizeString).min(1, "At least one theme required").max(20, "Too many themes"),
    avoid_topics: z.array(validateAndSanitizeString).max(20, "Too many topics to avoid").optional()
  }),
  requirements: z.object({
    min_followers: validateInteger.optional(),
    min_engagement_rate: validatePercentage.optional(),
    geographic_focus: z.array(validateAndSanitizeString).max(10, "Too many geographic locations").optional(),
    age_range: z.object({
      min: z.number().int().min(13, "Minimum age too low").max(100, "Minimum age too high").optional(),
      max: z.number().int().min(13, "Maximum age too low").max(100, "Maximum age too high").optional()
    }).optional()
  }).optional()
})

// Creator onboarding validation schema
export const CreatorOnboardingSchema = z.object({
  analytics: z.object({
    growthRate: z.string().regex(/^[0-9.-]+$/, "Invalid growth rate format").transform(v => parseFloat(v)),
    ageRanges: z.array(z.object({
      range: z.string().min(1, "Age range required").max(20, "Age range too long"),
      percentage: z.string().regex(/^[0-9.]+$/, "Invalid percentage format").transform(v => parseFloat(v))
    })).min(1, "At least one age range required").max(10, "Too many age ranges"),
    genderSplit: z.object({
      male: z.string().regex(/^[0-9.]+$/, "Invalid percentage").transform(v => parseFloat(v)),
      female: z.string().regex(/^[0-9.]+$/, "Invalid percentage").transform(v => parseFloat(v)),
      other: z.string().regex(/^[0-9.]+$/, "Invalid percentage").transform(v => parseFloat(v))
    }),
    topLocations: z.array(validateAndSanitizeString).max(20, "Too many locations"),
    avgLikes: z.string().regex(/^[0-9]+$/, "Invalid likes format").transform(v => parseInt(v))
  }),
  identity: z.object({
    contentPillars: z.array(validateAndSanitizeString).min(1, "At least one content pillar required").max(10, "Too many content pillars"),
    brandValues: z.array(validateAndSanitizeString).min(1, "At least one brand value required").max(15, "Too many brand values"),
    pastBrands: z.array(validateAndSanitizeString).max(50, "Too many past brands"),
    dreamBrands: z.array(validateAndSanitizeString).max(20, "Too many dream brands"),
    blacklistIndustries: z.array(validateAndSanitizeString).max(20, "Too many blacklist industries"),
    aestheticKeywords: z.array(validateAndSanitizeString).max(30, "Too many aesthetic keywords"),
    audienceProblems: z.array(validateAndSanitizeString).max(20, "Too many audience problems"),
    audienceAspirations: z.array(validateAndSanitizeString).max(20, "Too many audience aspirations"),
    incomeLevel: z.enum(['low', 'medium', 'high', 'luxury'])
  }),
  professional: z.object({
    monthlyGoal: z.string().regex(/^[0-9]+$/, "Invalid monthly goal format").transform(v => parseInt(v)),
    hoursPerWeek: z.string().regex(/^[0-9]+$/, "Invalid hours format").transform(v => parseInt(v)).refine(v => v <= 168, "Cannot exceed 168 hours per week"),
    equipment: z.array(validateAndSanitizeString).max(20, "Too many equipment items"),
    skills: z.array(validateAndSanitizeString).max(30, "Too many skills"),
    languages: z.array(validateAndSanitizeString).max(10, "Too many languages"),
    travelRadius: z.string().regex(/^[0-9]+$/, "Invalid travel radius format").transform(v => parseInt(v)).refine(v => v <= 10000, "Travel radius too large")
  }),
  wellbeing: z.object({
    stressTriggers: z.array(validateAndSanitizeString).max(20, "Too many stress triggers"),
    communicationPreference: z.enum(['email', 'phone', 'text', 'video']),
    maxBrandsPerMonth: z.string().regex(/^[0-9]+$/, "Invalid max brands format").transform(v => parseInt(v)).refine(v => v <= 50, "Too many brands per month"),
    preferredWorkHours: validateAndSanitizeString
  })
})

// Brand discovery validation
export const BrandDiscoverySchema = z.object({
  url: z.string()
    .url("Invalid URL format")
    .max(500, "URL too long"),
  extract_emails: z.boolean().default(false),
  extract_social: z.boolean().default(true)
})

// Manual scraping validation (admin only)
export const ManualScrapingSchema = z.object({
  target_type: z.enum(['brand_websites', 'job_boards', 'influencer_platforms']).optional(),
  force_rescan: z.boolean().default(false),
  limit: z.number().int().min(1).max(1000).default(100).optional()
})

// Algorithm metrics validation
export const AlgorithmMetricsQuerySchema = z.object({
  days: z.number().int().min(1).max(90).default(7),
  include_details: z.boolean().default(false)
})

export const AlgorithmMetricsPostSchema = z.object({
  force_collect: z.boolean().default(false),
  collect_older: z.boolean().default(false)
})

// Authentication schemas
export const LoginSchema = z.object({
  email: validateEmail,
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
})

export const SignupSchema = z.object({
  email: validateEmail,
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase letter, one uppercase letter, and one number"),
  fullName: validateAndSanitizeString,
  instagramHandle: z.string()
    .min(1, "Instagram handle is required")
    .max(30, "Instagram handle too long")
    .regex(/^@?[a-zA-Z0-9._]+$/, "Invalid Instagram handle format")
    .transform(val => val.replace('@', '').toLowerCase()),
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, "Invalid phone number format")
    .max(20, "Phone number too long")
    .optional(),
  plan: z.enum(['balance', 'scale', 'expand']).default('balance'),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly')
})

// Brand signup schema (separate from creator signup)
export const BrandSignupSchema = z.object({
  email: validateEmail,
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase letter, one uppercase letter, and one number"),
  companyName: validateAndSanitizeString,
  contactName: validateAndSanitizeString,
  website: z.string()
    .url("Invalid website URL")
    .max(500, "URL too long")
    .optional()
    .or(z.literal('')),
  industry: z.string()
    .max(100, "Industry name too long")
    .optional()
    .transform(val => val ? sanitizeString(val) : val)
})

// General API response schemas for consistent error handling
export const ApiErrorSchema = z.object({
  error: z.string(),
  details: z.array(z.string()).optional(),
  code: z.string().optional()
})

export const ApiSuccessSchema = z.object({
  success: z.boolean(),
  message: z.string().optional()
})

// Validation helper function
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fieldName = 'request'
): { success: true; data: T } | { success: false; error: string; details: string[] } {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      )
      return {
        success: false,
        error: `Invalid ${fieldName}`,
        details
      }
    }
    return {
      success: false,
      error: `Validation failed for ${fieldName}`,
      details: ['Unknown validation error']
    }
  }
}

// Query parameter validation helper
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): { success: true; data: T } | { success: false; error: string; details: string[] } {
  const params: Record<string, any> = {}
  
  for (const [key, value] of searchParams.entries()) {
    // Convert string values to appropriate types
    if (value === 'true') params[key] = true
    else if (value === 'false') params[key] = false
    else if (!isNaN(Number(value)) && value.trim() !== '') params[key] = Number(value)
    else params[key] = value
  }
  
  return validateRequest(schema, params, 'query parameters')
}

// Path parameter validation helper
export function validatePathParams<T>(
  schema: z.ZodSchema<T>,
  params: Record<string, string>
): { success: true; data: T } | { success: false; error: string; details: string[] } {
  return validateRequest(schema, params, 'path parameters')
}