// Intelligent Brand-Creator Matching Algorithm

import { CreatorProfile, MATCHING_WEIGHTS, MATCH_THRESHOLDS } from './creator-profile-schema';
import { EnhancedBrand, BrandMatch } from './enhanced-brand-schema';

export class BrandMatchingEngine {
  
  /**
   * Calculate comprehensive match score between creator and brand
   */
  calculateMatch(creator: CreatorProfile, brand: EnhancedBrand): BrandMatch {
    const scores = {
      valuesAlignment: this.calculateValuesAlignment(creator, brand),
      audienceResonance: this.calculateAudienceResonance(creator, brand),
      contentStyleMatch: this.calculateContentStyleMatch(creator, brand),
      successProbability: this.calculateSuccessProbability(creator, brand)
    };
    
    // Calculate weighted overall score
    const overallScore = Math.round(
      scores.valuesAlignment.score * MATCHING_WEIGHTS.valuesAlignment +
      scores.audienceResonance.score * MATCHING_WEIGHTS.audienceResonance +
      scores.contentStyleMatch.score * MATCHING_WEIGHTS.contentStyleMatch +
      scores.successProbability.score * MATCHING_WEIGHTS.successProbability
    );
    
    // Determine match category
    let matchCategory: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    if (overallScore >= MATCH_THRESHOLDS.excellent) matchCategory = 'excellent';
    else if (overallScore >= MATCH_THRESHOLDS.good) matchCategory = 'good';
    else if (overallScore >= MATCH_THRESHOLDS.fair) matchCategory = 'fair';
    
    // Generate insights
    const insights = this.generateInsights(creator, brand, scores);
    
    // Calculate financials
    const financials = this.calculateFinancials(creator, brand);
    
    // Create outreach strategy
    const outreachStrategy = this.generateOutreachStrategy(creator, brand, scores);
    
    return {
      id: `${creator.id}-${brand.id}`,
      creatorId: creator.id,
      brandId: brand.id,
      overallScore,
      matchCategory,
      scores,
      insights,
      financials,
      outreachStrategy,
      status: 'discovered',
      lastStatusUpdate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  /**
   * Calculate values alignment between creator and brand
   */
  private calculateValuesAlignment(creator: CreatorProfile, brand: EnhancedBrand): {
    score: number;
    details: string[];
  } {
    const details: string[] = [];
    let score = 0;
    
    // Check direct value matches
    const sharedValues = creator.identity.brandValues.filter(value => 
      brand.values.coreValues.includes(value)
    );
    const valueMatchPercentage = (sharedValues.length / creator.identity.brandValues.length) * 100;
    score += valueMatchPercentage * 0.4;
    
    if (sharedValues.length > 0) {
      details.push(`Shared values: ${sharedValues.join(', ')}`);
    }
    
    // Check for blacklist conflicts
    const isBlacklisted = creator.identity.blacklistBrands.some(blacklist => 
      brand.name.toLowerCase().includes(blacklist.toLowerCase()) ||
      brand.industry.toLowerCase().includes(blacklist.toLowerCase())
    );
    
    if (isBlacklisted) {
      score = 0;
      details.push('Brand is on creator\'s blacklist');
      return { score, details };
    }
    
    // ESG alignment bonus
    if (brand.values.esgRating && brand.values.esgRating > 70) {
      score += 20;
      details.push(`Strong ESG rating: ${brand.values.esgRating}/100`);
    }
    
    // Controversy penalty
    if (brand.values.controversyHistory.hasControversies) {
      score -= 20;
      details.push('Recent controversy may conflict with creator values');
    }
    
    // Dream brand bonus
    if (creator.identity.dreamBrands.includes(brand.name)) {
      score += 20;
      details.push('This is one of creator\'s dream brands!');
    }
    
    // Past brand similarity bonus
    if (creator.identity.pastBrands && creator.identity.pastBrands.length > 0) {
      // Check if brand is similar to past collaborations
      const similarToPastBrands = creator.identity.pastBrands.some(pastBrand => {
        // Same industry or similar brand positioning
        return brand.industry.toLowerCase().includes(pastBrand.toLowerCase().split(' ')[0]) ||
               brand.industry.marketSegment === this.getMarketSegment(pastBrand);
      });
      
      if (similarToPastBrands) {
        score += 15;
        details.push('Similar to brands creator has successfully worked with');
      }
      
      // Direct repeat collaboration opportunity
      if (creator.identity.pastBrands.map(b => b.toLowerCase()).includes(brand.name.toLowerCase())) {
        score += 10;
        details.push('Previous successful collaboration with this brand');
      }
    }
    
    // Supply chain ethics bonus
    if (brand.values.supplyChainEthics === 'certified' && 
        creator.identity.brandValues.includes('sustainability')) {
      score += 10;
      details.push('Certified ethical supply chain aligns with creator values');
    }
    
    return { 
      score: Math.max(0, Math.min(100, score)), 
      details 
    };
  }
  
  /**
   * Calculate audience resonance and overlap
   */
  private calculateAudienceResonance(creator: CreatorProfile, brand: EnhancedBrand): {
    score: number;
    overlapPercentage: number;
    sharedInterests: string[];
  } {
    let score = 0;
    const sharedInterests: string[] = [];
    
    // Age range overlap
    const creatorAgeRanges = creator.analytics.audienceDemographics.ageRanges.map(r => r.range);
    const ageOverlap = creatorAgeRanges.filter(range => 
      brand.targeting.audienceDemographics.ageRanges.includes(range)
    );
    const ageOverlapScore = (ageOverlap.length / brand.targeting.audienceDemographics.ageRanges.length) * 30;
    score += ageOverlapScore;
    
    // Enhanced Location Matching (25% of audience score)
    let locationScore = 0;
    const locationDetails: string[] = [];
    
    // Get creator's audience location data with percentages
    const creatorLocations = creator.analytics.audienceDemographics.topLocations;
    const brandTargetCountries = brand.targeting.audienceDemographics.locations.countries;
    const brandTargetCities = brand.targeting.audienceDemographics.locations.cities || [];
    
    // Calculate weighted location overlap
    let totalAudienceOverlap = 0;
    
    for (const location of creatorLocations) {
      // Country-level matching
      if (brandTargetCountries.includes(location.country)) {
        totalAudienceOverlap += location.percentage;
        
        // Bonus for city-level match (if city data exists)
        if (location.city && brandTargetCities.length > 0 && brandTargetCities.includes(location.city)) {
          totalAudienceOverlap += location.percentage * 0.5; // 50% bonus for exact city match
          locationDetails.push(`${location.city}, ${location.country} (${location.percentage}% exact match)`);
        } else if (location.city) {
          locationDetails.push(`${location.country} (${location.percentage}% country match, ${location.city})`);
        } else {
          locationDetails.push(`${location.country} (${location.percentage}% country match)`);
        }
      }
    }
    
    // Scale location score based on overlap percentage
    if (totalAudienceOverlap > 80) {
      locationScore = 25; // Excellent geographic alignment
      sharedInterests.push(`Excellent location match: ${Math.round(totalAudienceOverlap)}% audience overlap`);
    } else if (totalAudienceOverlap > 60) {
      locationScore = 20; // Good geographic alignment
      sharedInterests.push(`Strong location match: ${Math.round(totalAudienceOverlap)}% audience overlap`);
    } else if (totalAudienceOverlap > 40) {
      locationScore = 15; // Fair geographic alignment
      sharedInterests.push(`Moderate location match: ${Math.round(totalAudienceOverlap)}% audience overlap`);
    } else if (totalAudienceOverlap > 20) {
      locationScore = 10; // Minimal geographic alignment
    } else if (totalAudienceOverlap > 0) {
      locationScore = 5; // Very limited geographic alignment
    } else {
      locationScore = 0; // No geographic alignment - major concern
      // This should significantly impact the overall match
    }
    
    score += locationScore;
    
    // Income level alignment
    const audienceIncomeMatches = brand.targeting.audienceDemographics.incomeLevel.includes(
      creator.identity.audiencePsychographics.incomeLevel
    );
    if (audienceIncomeMatches) {
      score += 15;
    }
    
    // Interest overlap
    const creatorInterests = creator.analytics.audienceDemographics.interests;
    const brandNiches = brand.targeting.niches;
    sharedInterests.push(...creatorInterests.filter(interest => 
      brandNiches.some(niche => interest.toLowerCase().includes(niche.toLowerCase()))
    ));
    
    const interestOverlapScore = (sharedInterests.length / brandNiches.length) * 25;
    score += interestOverlapScore;
    
    // Gender alignment (if brand has preference)
    if (brand.targeting.audienceDemographics.genderPreference) {
      const genderSplit = creator.analytics.audienceDemographics.genderSplit;
      const dominantGender = genderSplit.female > genderSplit.male ? 'female' : 'male';
      if (dominantGender === brand.targeting.audienceDemographics.genderPreference) {
        score += 10;
      }
    } else {
      score += 10; // No preference means any gender split is fine
    }
    
    const overlapPercentage = Math.round(score);
    
    return {
      score: Math.min(100, score),
      overlapPercentage,
      sharedInterests
    };
  }
  
  /**
   * Calculate content style compatibility
   */
  private calculateContentStyleMatch(creator: CreatorProfile, brand: EnhancedBrand): {
    score: number;
    matchingElements: string[];
    concerns: string[];
  } {
    let score = 0;
    const matchingElements: string[] = [];
    const concerns: string[] = [];
    
    // Content format match
    if (brand.targeting.contentFormats.includes(creator.identity.contentStyle.primaryFormat)) {
      score += 30;
      matchingElements.push(`Primary format match: ${creator.identity.contentStyle.primaryFormat}`);
    } else {
      concerns.push('Primary content format doesn\'t match brand preference');
    }
    
    // Aesthetic alignment
    const aestheticMatches = creator.identity.contentStyle.aestheticKeywords.filter(keyword =>
      brand.targeting.aesthetics.includes(keyword)
    );
    if (aestheticMatches.length > 0) {
      score += (aestheticMatches.length / brand.targeting.aesthetics.length) * 40;
      matchingElements.push(`Aesthetic match: ${aestheticMatches.join(', ')}`);
    }
    
    // Production value alignment
    const productionMatch = (
      (creator.identity.contentStyle.productionValue === 'professional' && 
       brand.campaigns.contentRequirements.approvalsNeeded > 2) ||
      (creator.identity.contentStyle.productionValue === 'authentic' && 
       brand.campaigns.contentRequirements.approvalsNeeded <= 2)
    );
    
    if (productionMatch) {
      score += 20;
      matchingElements.push('Production style aligns with brand expectations');
    } else {
      concerns.push('Production style may not match brand expectations');
    }
    
    // Caption style bonus
    if (creator.identity.contentStyle.captionStyle === 'storytelling' && 
        brand.values.coreValues.includes('authenticity')) {
      score += 10;
      matchingElements.push('Storytelling style aligns with brand authenticity');
    }
    
    return {
      score: Math.min(100, score),
      matchingElements,
      concerns
    };
  }
  
  /**
   * Calculate success probability based on historical data
   */
  private calculateSuccessProbability(creator: CreatorProfile, brand: EnhancedBrand): {
    score: number;
    factors: string[];
  } {
    let score = B;
    const factors: string[] = [];
    
    // Creator size preference match
    const creatorSize = this.getCreatorSize(creator.analytics.followerCount);
    if (brand.history.preferredCreatorSize === creatorSize) {
      score += 30;
      factors.push(`Brand typically works with ${creatorSize} creators`);
    }
    
    // Engagement rate match
    if (creator.analytics.engagementRate >= brand.targeting.engagementRate.min) {
      score += 25;
      if (creator.analytics.engagementRate >= brand.targeting.engagementRate.preferred) {
        score += 15;
        factors.push('Engagement rate exceeds brand\'s preferred threshold');
      } else {
        factors.push('Engagement rate meets minimum requirements');
      }
    }
    
    // Historical success with similar creators
    const avgHistoricalEngagement = brand.history.successMetrics.avgEngagementRate;
    if (Math.abs(creator.analytics.engagementRate - avgHistoricalEngagement) < 2) {
      score += 20;
      factors.push('Similar engagement to brand\'s successful partnerships');
    }
    
    // Timing bonus
    const timeSinceLastCampaign = brand.intelligence.lastCampaignDate ? 
      (Date.now() - brand.intelligence.lastCampaignDate.getTime()) / (1000 * 60 * 60 * 24) : 365;
    
    if (timeSinceLastCampaign > 90) {
      score += 10;
      factors.push('Brand likely ready for new partnerships');
    }
    
    return {
      score: Math.min(100, score),
      factors
    };
  }
  
  /**
   * Generate actionable insights from match analysis
   */
  private generateInsights(
    creator: CreatorProfile, 
    brand: EnhancedBrand, 
    scores: any
  ): {
    strengths: string[];
    opportunities: string[];
    concerns: string[];
    suggestedApproach: string;
    estimatedResponseRate: number;
  } {
    const strengths: string[] = [];
    const opportunities: string[] = [];
    const concerns: string[] = [];
    
    // Analyze strengths
    if (scores.valuesAlignment.score > 80) {
      strengths.push('Exceptional values alignment creates authentic partnership potential');
    }
    if (scores.audienceResonance.score > 85) {
      strengths.push('High audience overlap suggests strong conversion potential');
    }
    if (creator.identity.dreamBrands.includes(brand.name)) {
      strengths.push('Creator\'s enthusiasm for brand will show in content');
    }
    
    // Identify opportunities
    if (brand.intelligence.upcomingCampaigns.length > 0) {
      opportunities.push(`Upcoming campaign: ${brand.intelligence.upcomingCampaigns[0].theme || 'New launch'}`);
    }
    if (scores.successProbability.factors.includes('Brand likely ready for new partnerships')) {
      opportunities.push('Timing is ideal - brand hasn\'t partnered recently');
    }
    
    // Flag concerns
    concerns.push(...scores.contentStyleMatch.concerns);
    if (brand.campaigns.exclusivityRequired && creator.professional.availability.hoursPerWeek < 20) {
      concerns.push('Brand requires exclusivity which may conflict with creator availability');
    }
    
    // Location-based concerns
    const locationOverlap = this.calculateLocationOverlap(creator, brand);
    if (locationOverlap === 0) {
      concerns.push('No geographic overlap - brand may not ship to your audience locations');
    } else if (locationOverlap < 20) {
      concerns.push('Limited geographic overlap - only small portion of audience can purchase');
    }
    
    // Determine approach
    let suggestedApproach = 'Standard outreach with personalization';
    if (scores.valuesAlignment.score > 90 && scores.audienceResonance.score > 85) {
      suggestedApproach = 'Lead with strong value and audience alignment';
    } else if (creator.identity.dreamBrands.includes(brand.name)) {
      suggestedApproach = 'Leverage dream brand status with specific creative ideas';
    } else if (opportunities.length > 0) {
      suggestedApproach = 'Reference upcoming campaign opportunity';
    }
    
    // Estimate response rate
    const baseResponseRate = 15;
    let responseModifier = 0;
    
    if (scores.overallScore > 85) responseModifier += 25;
    else if (scores.overallScore > 70) responseModifier += 15;
    else if (scores.overallScore > 50) responseModifier += 5;
    
    if (creator.identity.dreamBrands.includes(brand.name)) responseModifier += 20;
    if (brand.automation.decisionMakerActive) responseModifier += 10;
    
    const estimatedResponseRate = Math.min(75, baseResponseRate + responseModifier);
    
    return {
      strengths,
      opportunities,
      concerns,
      suggestedApproach,
      estimatedResponseRate
    };
  }
  
  /**
   * Calculate financial recommendations
   */
  private calculateFinancials(creator: CreatorProfile, brand: EnhancedBrand): {
    suggestedRate: number;
    marketRate: number;
    negotiationRoom: string;
  } {
    // Base rate calculation
    const followerCount = creator.analytics.followerCount;
    const engagementRate = creator.analytics.engagementRate;
    
    // Market rate formula (simplified)
    const baseRate = Math.floor(followerCount / 1000) * 10;
    const engagementMultiplier = engagementRate > 5 ? 1.5 : engagementRate > 3 ? 1.2 : 1;
    const marketRate = Math.round(baseRate * engagementMultiplier);
    
    // Adjust for brand budget
    let suggestedRate = marketRate;
    if (marketRate > brand.campaigns.budgetRange.max) {
      suggestedRate = brand.campaigns.budgetRange.max;
    } else if (marketRate < brand.campaigns.budgetRange.min) {
      suggestedRate = brand.campaigns.budgetRange.min;
    }
    
    // Premium for dream brands
    if (creator.identity.dreamBrands.includes(brand.name)) {
      suggestedRate = Math.round(suggestedRate * 0.8); // Willing to work for less
    }
    
    // Determine negotiation room
    let negotiationRoom = 'Standard 10-20% negotiation expected';
    if (suggestedRate < marketRate * 0.8) {
      negotiationRoom = 'Limited room - already below market';
    } else if (brand.history.successMetrics.avgROI && brand.history.successMetrics.avgROI > 3) {
      negotiationRoom = 'Strong ROI history - push for 20-30% above initial offer';
    }
    
    return {
      suggestedRate,
      marketRate,
      negotiationRoom
    };
  }
  
  /**
   * Generate personalized outreach strategy
   */
  private generateOutreachStrategy(
    creator: CreatorProfile,
    brand: EnhancedBrand,
    scores: any
  ): {
    recommendedChannel: 'email' | 'instagram' | 'linkedin';
    personalizedHooks: string[];
    contentIdeas: string[];
    bestTiming: string;
  } {
    // Determine channel
    let recommendedChannel: 'email' | 'instagram' | 'linkedin' = 'email';
    if (brand.contacts.primary.preferredChannel) {
      recommendedChannel = brand.contacts.primary.preferredChannel;
    } else if (brand.instagramHandle && creator.analytics.followerCount < 50000) {
      recommendedChannel = 'instagram';
    }
    
    // Generate hooks
    const personalizedHooks: string[] = [];
    
    if (brand.intelligence.upcomingCampaigns.length > 0) {
      personalizedHooks.push(`Noticed your upcoming ${brand.intelligence.upcomingCampaigns[0].theme} campaign`);
    }
    
    if (scores.audienceResonance.sharedInterests.length > 0) {
      personalizedHooks.push(`My audience is obsessed with ${scores.audienceResonance.sharedInterests[0]}`);
    }
    
    if (creator.identity.dreamBrands.includes(brand.name)) {
      personalizedHooks.push(`I've been a genuine fan of ${brand.name} since [specific moment]`);
    }
    
    if (scores.valuesAlignment.details.includes('Shared values')) {
      const sharedValue = scores.valuesAlignment.details[0].split(': ')[1].split(',')[0];
      personalizedHooks.push(`Your commitment to ${sharedValue} aligns perfectly with my content`);
    }
    
    // Generate content ideas
    const contentIdeas = this.generateContentIdeas(creator, brand);
    
    // Best timing
    const bestTiming = brand.automation.bestOutreachTimes[0] || 'Tuesday 10AM';
    
    return {
      recommendedChannel,
      personalizedHooks,
      contentIdeas,
      bestTiming
    };
  }
  
  /**
   * Generate specific content ideas for outreach
   */
  private generateContentIdeas(creator: CreatorProfile, brand: EnhancedBrand): string[] {
    const ideas: string[] = [];
    
    // Based on creator's top content pillars
    const pillar = creator.identity.contentPillars[0];
    const format = creator.identity.contentStyle.primaryFormat;
    
    ideas.push(`${format} series: "${pillar} meets ${brand.name}"`);
    
    // Seasonal or trending angle
    const month = new Date().toLocaleString('default', { month: 'long' });
    ideas.push(`${month} campaign: "My ${pillar} essentials featuring ${brand.name}"`);
    
    // User-generated content angle
    if (creator.identity.audiencePsychographics.problems.length > 0) {
      const problem = creator.identity.audiencePsychographics.problems[0];
      ideas.push(`Problem-solving content: "How ${brand.name} helps with ${problem}"`);
    }
    
    return ideas.slice(0, 3); // Return top 3 ideas
  }
  
  /**
   * Helper to categorize creator size
   */
  private getCreatorSize(followerCount: number): string {
    if (followerCount < 10000) return 'nano';
    if (followerCount < 100000) return 'micro';
    if (followerCount < 1000000) return 'macro';
    return 'mega';
  }
  
  /**
   * Helper to calculate location overlap percentage
   */
  private calculateLocationOverlap(creator: CreatorProfile, brand: EnhancedBrand): number {
    const creatorLocations = creator.analytics.audienceDemographics.topLocations;
    const brandTargetCountries = brand.targeting.audienceDemographics.locations.countries;
    
    let totalOverlap = 0;
    for (const location of creatorLocations) {
      if (brandTargetCountries.includes(location.country)) {
        totalOverlap += location.percentage;
      }
    }
    
    return totalOverlap;
  }

  /**
   * Helper method to determine market segment from brand name
   */
  private getMarketSegment(brandName: string): string {
    const brandLower = brandName.toLowerCase();
    
    // Fashion & Apparel
    if (['nike', 'adidas', 'zara', 'h&m', 'uniqlo', 'gap', 'levis', 'puma'].some(b => brandLower.includes(b))) {
      return 'mid-market';
    }
    if (['gucci', 'prada', 'chanel', 'dior', 'hermes', 'versace'].some(b => brandLower.includes(b))) {
      return 'luxury';
    }
    
    // Beauty
    if (['sephora', 'ulta', 'glossier', 'fenty', 'nyx', 'elf'].some(b => brandLower.includes(b))) {
      return 'mid-market';
    }
    if (['lancome', 'estee lauder', 'charlotte tilbury', 'tom ford'].some(b => brandLower.includes(b))) {
      return 'premium';
    }
    
    // Tech
    if (['apple', 'samsung', 'google', 'microsoft'].some(b => brandLower.includes(b))) {
      return 'premium';
    }
    
    // Food & Beverage
    if (['whole foods', 'sweetgreen', 'chipotle'].some(b => brandLower.includes(b))) {
      return 'premium';
    }
    
    // Default
    return 'mid-market';
  }
}