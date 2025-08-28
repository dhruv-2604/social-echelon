// Industry-Specific Matching Weight Configurations
// These weights optimize matching based on what matters most for each industry

export interface IndustryWeights {
  valuesAlignment: number;
  audienceResonance: number;
  contentStyleMatch: number;
  successProbability: number;
}

export const INDUSTRY_WEIGHTS: Record<string, IndustryWeights> = {
  // Fashion & Beauty prioritize aesthetics and engagement
  'Fashion': {
    valuesAlignment: 0.15,
    audienceResonance: 0.30,
    contentStyleMatch: 0.40,  // Aesthetics matter most
    successProbability: 0.15
  },
  
  'Beauty': {
    valuesAlignment: 0.20,
    audienceResonance: 0.30,
    contentStyleMatch: 0.35,  // Visual content crucial
    successProbability: 0.15
  },
  
  'Jewelry': {
    valuesAlignment: 0.25,  // Luxury values important
    audienceResonance: 0.35,
    contentStyleMatch: 0.30,
    successProbability: 0.10
  },
  
  'Jewelry & Accessories': {
    valuesAlignment: 0.25,
    audienceResonance: 0.35,
    contentStyleMatch: 0.30,
    successProbability: 0.10
  },
  
  // Tech & Apps prioritize audience match
  'Technology': {
    valuesAlignment: 0.20,
    audienceResonance: 0.50,  // Right audience crucial
    contentStyleMatch: 0.20,
    successProbability: 0.10
  },
  
  'Education': {
    valuesAlignment: 0.25,
    audienceResonance: 0.45,
    contentStyleMatch: 0.20,
    successProbability: 0.10
  },
  
  // Food & Beverage balance all factors
  'Food': {
    valuesAlignment: 0.25,
    audienceResonance: 0.35,
    contentStyleMatch: 0.25,
    successProbability: 0.15
  },
  
  'Beverage': {
    valuesAlignment: 0.30,  // Brand values matter for beverages
    audienceResonance: 0.35,
    contentStyleMatch: 0.20,
    successProbability: 0.15
  },
  
  // Health & Wellness prioritize values and trust
  'Health & Nutrition': {
    valuesAlignment: 0.35,  // Trust and values critical
    audienceResonance: 0.35,
    contentStyleMatch: 0.20,
    successProbability: 0.10
  },
  
  'Fitness': {
    valuesAlignment: 0.25,
    audienceResonance: 0.40,
    contentStyleMatch: 0.25,
    successProbability: 0.10
  },
  
  // Travel & Hospitality
  'Travel': {
    valuesAlignment: 0.20,
    audienceResonance: 0.45,  // Location and demographics crucial
    contentStyleMatch: 0.25,
    successProbability: 0.10
  },
  
  // Default weights (original)
  'default': {
    valuesAlignment: 0.20,
    audienceResonance: 0.50,
    contentStyleMatch: 0.20,
    successProbability: 0.10
  }
};

// Campaign type keywords and their implications
export const CAMPAIGN_PATTERNS = {
  partnershipTypes: {
    'ambassador': { duration: 'long-term', exclusivity: true, budgetMultiplier: 1.5 },
    'long-term': { duration: 'long-term', exclusivity: false, budgetMultiplier: 1.3 },
    'campaign-specific': { duration: 'short-term', exclusivity: false, budgetMultiplier: 1.0 },
    'one-off': { duration: 'short-term', exclusivity: false, budgetMultiplier: 0.9 },
    'seasonal': { duration: 'short-term', exclusivity: false, budgetMultiplier: 1.1 },
    'exclusive': { duration: 'varies', exclusivity: true, budgetMultiplier: 1.4 },
    'celebrity': { duration: 'varies', exclusivity: false, budgetMultiplier: 2.0 },
    'endorsement': { duration: 'long-term', exclusivity: true, budgetMultiplier: 1.6 }
  },
  
  contentFocus: {
    'ugc': { productionValue: 'authentic', turnaround: 'fast' },
    'user-generated': { productionValue: 'authentic', turnaround: 'fast' },
    'professional': { productionValue: 'professional', turnaround: 'slow' },
    'lifestyle': { productionValue: 'mixed', turnaround: 'medium' },
    'tutorial': { productionValue: 'professional', turnaround: 'slow' },
    'unboxing': { productionValue: 'authentic', turnaround: 'fast' },
    'review': { productionValue: 'authentic', turnaround: 'medium' },
    'storytelling': { productionValue: 'mixed', turnaround: 'medium' }
  },
  
  campaignThemes: {
    'sustainability': ['eco-conscious', 'sustainable', 'green', 'environmental'],
    'diversity': ['inclusive', 'diverse', 'representation', 'equality'],
    'wellness': ['health', 'mindfulness', 'selfcare', 'balance'],
    'innovation': ['tech', 'innovative', 'cutting-edge', 'modern'],
    'luxury': ['premium', 'exclusive', 'high-end', 'sophisticated'],
    'community': ['togetherness', 'belonging', 'support', 'connection'],
    'empowerment': ['confidence', 'strength', 'inspiration', 'motivation']
  }
};

// Engagement type importance by industry
export const ENGAGEMENT_PRIORITIES = {
  'Fashion': { saves: 0.4, likes: 0.3, comments: 0.2, shares: 0.1 },
  'Beauty': { saves: 0.35, comments: 0.35, likes: 0.2, shares: 0.1 },
  'Technology': { comments: 0.4, shares: 0.3, likes: 0.2, saves: 0.1 },
  'Food': { saves: 0.45, likes: 0.25, comments: 0.2, shares: 0.1 },
  'Fitness': { saves: 0.3, comments: 0.3, likes: 0.25, shares: 0.15 },
  'Travel': { saves: 0.4, likes: 0.3, comments: 0.15, shares: 0.15 },
  'default': { likes: 0.3, comments: 0.3, saves: 0.25, shares: 0.15 }
};

// Location importance by industry
export const LOCATION_IMPORTANCE = {
  'Fashion': 0.30,  // Moderate - style transcends borders
  'Beauty': 0.25,   // Low-moderate - beauty is universal
  'Technology': 0.20,  // Low - digital products work globally
  'Food': 0.60,     // High - delivery/availability crucial
  'Beverage': 0.55,  // High - distribution matters
  'Fitness': 0.35,   // Moderate - some equipment ships globally
  'Travel': 0.70,    // Very high - destination specific
  'Jewelry': 0.40,   // Moderate - shipping but luxury concerns
  'Health & Nutrition': 0.50,  // High - regulations vary by country
  'Education': 0.15,  // Low - online education is global
  'default': 0.35
};

// Helper function to get weights for an industry
export function getIndustryWeights(industry: string): IndustryWeights {
  return INDUSTRY_WEIGHTS[industry] || INDUSTRY_WEIGHTS['default'];
}

// Helper function to extract campaign patterns from text
export function extractCampaignPatterns(text: string) {
  const textLower = text.toLowerCase();
  const patterns = {
    partnershipType: null as string | null,
    contentFocus: [] as string[],
    themes: [] as string[],
    celebrityMentioned: false
  };
  
  // Check partnership types
  for (const [type] of Object.entries(CAMPAIGN_PATTERNS.partnershipTypes)) {
    if (textLower.includes(type)) {
      patterns.partnershipType = type;
      break;
    }
  }
  
  // Check content focus
  for (const [focus] of Object.entries(CAMPAIGN_PATTERNS.contentFocus)) {
    if (textLower.includes(focus)) {
      patterns.contentFocus.push(focus);
    }
  }
  
  // Check themes
  for (const [theme, keywords] of Object.entries(CAMPAIGN_PATTERNS.campaignThemes)) {
    if (keywords.some(keyword => textLower.includes(keyword))) {
      patterns.themes.push(theme);
    }
  }
  
  // Check for celebrity mentions
  patterns.celebrityMentioned = /celebrity|influencer|ambassador|endorsement/.test(textLower);
  
  return patterns;
}

// Calculate location match score with audience percentage weighting
export function calculateLocationScore(
  creatorLocations: Array<{ country: string; city?: string; percentage: number }>,
  shipsToCountries: string[]
): { score: number; coverage: number; details: string[] } {
  let totalCoverage = 0;
  const details: string[] = [];
  
  // Handle special cases
  if (shipsToCountries.includes('GLOBAL') || shipsToCountries.includes('global')) {
    return { 
      score: 100, 
      coverage: 100, 
      details: ['Brand ships globally - perfect location match'] 
    };
  }
  
  // Calculate coverage
  for (const location of creatorLocations) {
    if (shipsToCountries.some(country => 
      country.toLowerCase() === location.country.toLowerCase() ||
      country === getCountryCode(location.country)
    )) {
      totalCoverage += location.percentage;
      details.push(`${location.country}: ${location.percentage}% audience covered`);
    }
  }
  
  // Calculate score based on coverage thresholds
  let score = 0;
  if (totalCoverage >= 80) {
    score = 100;
    details.unshift('Excellent: 80%+ of audience can purchase');
  } else if (totalCoverage >= 60) {
    score = 75;
    details.unshift('Good: 60-80% of audience can purchase');
  } else if (totalCoverage >= 40) {
    score = 50;
    details.unshift('Fair: 40-60% of audience can purchase');
  } else if (totalCoverage >= 20) {
    score = 25;
    details.unshift('Limited: 20-40% of audience can purchase');
  } else {
    score = 0;
    details.unshift('Poor: Less than 20% of audience can purchase');
  }
  
  return { score, coverage: totalCoverage, details };
}

// Helper to convert country names to codes
function getCountryCode(country: string): string {
  const codes: Record<string, string> = {
    'united states': 'US',
    'usa': 'US',
    'united kingdom': 'UK',
    'great britain': 'GB',
    'canada': 'CA',
    'australia': 'AU',
    'france': 'FR',
    'germany': 'DE',
    'italy': 'IT',
    'spain': 'ES',
    'netherlands': 'NL',
    'belgium': 'BE',
    'switzerland': 'CH',
    'sweden': 'SE',
    'norway': 'NO',
    'denmark': 'DK',
    'japan': 'JP',
    'south korea': 'KR',
    'singapore': 'SG',
    'hong kong': 'HK',
    'new zealand': 'NZ',
    'brazil': 'BR',
    'mexico': 'MX',
    'india': 'IN',
    'uae': 'AE',
    'saudi arabia': 'SA'
  };
  
  return codes[country.toLowerCase()] || country.toUpperCase().slice(0, 2);
}