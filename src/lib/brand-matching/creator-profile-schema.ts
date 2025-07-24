// Creator Profile Schema for Brand Matching System

export interface CreatorProfile {
  // Basic Info
  id: string;
  userId: string;
  instagramHandle: string;
  
  // Step 1: Instagram Analytics (User-Provided)
  analytics: {
    engagementRate: number;
    avgLikes: number;
    avgComments: number;
    avgViews: number;
    followerCount: number;
    followerGrowthRate: number; // % per month
    topPostingTimes: string[]; // e.g., ["Monday 6PM", "Thursday 7PM"]
    audienceDemographics: {
      ageRanges: { range: string; percentage: number }[]; // e.g., [{ range: "18-24", percentage: 35 }]
      genderSplit: { male: number; female: number; other: number };
      topLocations: { city: string; country: string; percentage: number }[];
      interests: string[]; // e.g., ["sustainable fashion", "travel", "wellness"]
    };
  };
  
  // Step 2: Creator Identity
  identity: {
    contentPillars: string[]; // 3-5 main themes
    brandValues: string[]; // Top 5 values
    pastBrands: string[]; // Brands they've worked with before
    dreamBrands: string[]; // 10 brands they'd love to work with
    blacklistBrands: string[]; // Brands/industries to avoid
    contentStyle: {
      primaryFormat: 'reels' | 'carousel' | 'static' | 'stories';
      aestheticKeywords: string[]; // e.g., ["minimalist", "colorful", "moody"]
      captionStyle: 'short' | 'storytelling' | 'educational' | 'humorous';
      productionValue: 'professional' | 'authentic' | 'mixed';
    };
    audiencePsychographics: {
      problems: string[]; // What challenges does your audience face?
      aspirations: string[]; // What do they aspire to?
      incomeLevel: 'low' | 'medium' | 'high' | 'luxury';
      similarCreators: string[]; // Other creators they follow
    };
  };
  
  // Step 3: Professional Setup
  professional: {
    currentIncomeSources: {
      source: string;
      percentage: number;
    }[];
    incomeGoals: {
      realistic: number; // Monthly
      stretch: number; // Monthly
    };
    availability: {
      hoursPerWeek: number;
      turnaroundTime: number; // Days for content creation
    };
    capabilities: {
      equipment: string[]; // e.g., ["DSLR", "Ring light", "Gimbal"]
      skills: string[]; // e.g., ["Video editing", "Photography", "Copywriting"]
      languages: string[];
      travelRadius: number; // Miles willing to travel
    };
  };
  
  // Step 4: Mental Health Baseline
  wellbeing: {
    stressTriggers: string[]; // e.g., ["rejection", "slow payment", "tight deadlines"]
    communicationPreference: 'email' | 'phone' | 'text' | 'video';
    workLifeBalance: {
      maxBrandsPerMonth: number;
      blackoutDates: Date[]; // Vacation/personal time
      preferredWorkHours: string[]; // e.g., ["9AM-5PM EST"]
    };
    supportNeeds: string[]; // e.g., ["accountability partner", "negotiation help"]
  };
  
  // AI-Enhanced Profile Scores
  scores: {
    contentDNA: {
      colorPalette: string[]; // Hex codes
      compositionStyle: string; // e.g., "rule-of-thirds", "centered", "dynamic"
      emotionalTone: string[]; // e.g., ["inspiring", "relatable", "aspirational"]
      engagementTriggers: string[]; // What drives engagement
    };
    audienceValue: {
      purchaseIntent: number; // 0-100
      brandAffinity: number; // 0-100
      communityLoyalty: number; // 0-100
      influenceScore: number; // 0-100
    };
    nicheAuthority: {
      [niche: string]: {
        expertiseLevel: number; // 0-100
        consistencyScore: number; // 0-100
        engagementDepth: number; // Comments vs likes ratio
        externalValidation: string[]; // Press mentions, awards, etc.
      };
    };
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  completionStatus: {
    analytics: boolean;
    identity: boolean;
    professional: boolean;
    wellbeing: boolean;
  };
}

// Brand Matching Weights Configuration
export const MATCHING_WEIGHTS = {
  valuesAlignment: 0.20,
  audienceResonance: 0.50,
  contentStyleMatch: 0.20,
  successProbability: 0.10
};

// Scoring Thresholds
export const MATCH_THRESHOLDS = {
  excellent: 85,
  good: 70,
  fair: 50,
  poor: 0
};