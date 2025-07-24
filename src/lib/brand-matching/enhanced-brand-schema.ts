// Enhanced Brand Schema for Intelligent Matching

export interface EnhancedBrand {
  // Core Brand Info
  id: string;
  name: string;
  website: string;
  instagramHandle: string;
  industry: string;
  subIndustry?: string;
  logoUrl?: string;
  description: string;
  
  // Contact Information
  contacts: {
    primary: {
      name: string;
      role: string; // e.g., "Influencer Marketing Manager"
      email: string;
      linkedIn?: string;
      preferredChannel: 'email' | 'instagram' | 'linkedin';
      responseTime: number; // Average hours to respond
    };
    secondary?: {
      name: string;
      role: string;
      email: string;
    };
  };
  
  // Detailed Targeting Criteria
  targeting: {
    followerRange: {
      min: number;
      max: number;
    };
    engagementRate: {
      min: number;
      preferred: number;
    };
    niches: string[]; // e.g., ["sustainable fashion", "minimalist lifestyle"]
    contentFormats: string[]; // e.g., ["reels", "carousel", "stories"]
    aesthetics: string[]; // e.g., ["bright", "moody", "minimalist"]
    audienceDemographics: {
      ageRanges: string[]; // e.g., ["18-24", "25-34"]
      genderPreference?: 'male' | 'female' | 'all';
      locations: {
        countries: string[];
        cities?: string[];
      };
      incomeLevel: string[]; // e.g., ["medium", "high"]
    };
  };
  
  // Brand Values & Culture
  values: {
    coreValues: string[]; // e.g., ["sustainability", "inclusivity", "innovation"]
    esgRating?: number; // Environmental, Social, Governance score
    controversyHistory: {
      hasControversies: boolean;
      details?: string[];
      lastIncident?: Date;
    };
    employeeSatisfaction?: number; // Glassdoor rating
    supplyChainEthics?: 'certified' | 'improving' | 'unknown';
  };
  
  // Campaign Preferences
  campaigns: {
    types: string[]; // e.g., ["sponsored_post", "ambassador", "affiliate", "product_seeding"]
    budgetRange: {
      min: number;
      max: number;
      currency: string;
    };
    paymentTerms: string; // e.g., "Net 30", "50% upfront"
    typicalDuration: string; // e.g., "3 months", "one-off"
    exclusivityRequired: boolean;
    rightsRequested: string[]; // e.g., ["usage_rights", "whitelisting", "perpetual"]
    contentRequirements: {
      approvalsNeeded: number; // Number of approval rounds
      revisionsIncluded: number;
      turnaroundExpectation: number; // Days
    };
  };
  
  // Historical Performance
  history: {
    pastInfluencers: {
      handle: string;
      followerSize: string; // "nano", "micro", "macro"
      campaignType: string;
      performance: {
        engagementRate: number;
        salesImpact?: string;
        brandSentiment?: 'positive' | 'neutral' | 'negative';
      };
      date: Date;
    }[];
    successMetrics: {
      avgEngagementRate: number;
      avgROI?: number;
      repeatCollaborationRate: number;
    };
    preferredCreatorSize: string; // Based on past success
  };
  
  // Discovery & Intelligence
  intelligence: {
    discoverySource: string; // e.g., "competitor_analysis", "industry_news", "creator_suggestion"
    lastCampaignDate?: Date;
    upcomingCampaigns: {
      name?: string;
      estimatedLaunch?: Date;
      theme?: string;
      budget?: number;
    }[];
    competitorInfluencers: string[]; // Influencers working with competitors
    marketPosition: 'leader' | 'challenger' | 'niche' | 'startup';
    growthTrajectory: 'rapid' | 'steady' | 'declining';
  };
  
  // Automation Settings
  automation: {
    outreachEnabled: boolean;
    warmupRequired: boolean;
    bestOutreachTimes: string[]; // e.g., ["Tuesday 10AM", "Thursday 2PM"]
    avoidDates: Date[]; // Blackout dates
    personalizedAngles: string[]; // Pre-researched talking points
    decisionMakerActive: boolean; // Is decision maker currently active on social
  };
  
  // Metadata
  verified: boolean;
  verificationDate?: Date;
  lastUpdated: Date;
  createdAt: Date;
  dataCompleteness: number; // 0-100% how complete the profile is
}

// Brand Discovery Queue Entry
export interface BrandDiscoveryEntry {
  id: string;
  brandName: string;
  website?: string;
  instagramHandle?: string;
  discoverySource: 'marketing_news' | 'competitor_tag' | 'hashtag_search' | 'creator_suggestion' | 'trade_publication';
  discoveryData: {
    sourceUrl?: string;
    relevantContent?: string;
    mentionedInfluencers?: string[];
    campaignDetails?: string;
    confidenceScore: number; // How confident we are this is a real opportunity
  };
  processingStatus: 'pending' | 'enriching' | 'ready' | 'failed';
  processingNotes?: string;
  createdAt: Date;
  processedAt?: Date;
}

// Match Result Interface
export interface BrandMatch {
  id: string;
  creatorId: string;
  brandId: string;
  
  // Overall Scores
  overallScore: number; // 0-100
  matchCategory: 'excellent' | 'good' | 'fair' | 'poor';
  
  // Detailed Scoring Breakdown
  scores: {
    valuesAlignment: {
      score: number;
      details: string[];
    };
    audienceResonance: {
      score: number;
      overlapPercentage: number;
      sharedInterests: string[];
    };
    contentStyleMatch: {
      score: number;
      matchingElements: string[];
      concerns: string[];
    };
    successProbability: {
      score: number;
      factors: string[];
    };
  };
  
  // Actionable Insights
  insights: {
    strengths: string[];
    opportunities: string[];
    concerns: string[];
    suggestedApproach: string;
    estimatedResponseRate: number;
  };
  
  // Financial Estimates
  financials: {
    suggestedRate: number;
    marketRate: number;
    negotiationRoom: string; // e.g., "10-20% above initial offer"
  };
  
  // Outreach Strategy
  outreachStrategy: {
    recommendedChannel: 'email' | 'instagram' | 'linkedin';
    personalizedHooks: string[];
    contentIdeas: string[];
    bestTiming: string;
  };
  
  // Status Tracking
  status: 'discovered' | 'qualified' | 'contacted' | 'responded' | 'negotiating' | 'closed_won' | 'closed_lost';
  lastStatusUpdate: Date;
  nextAction?: string;
  
  createdAt: Date;
  updatedAt: Date;
}