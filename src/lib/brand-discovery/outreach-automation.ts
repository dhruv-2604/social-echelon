import { createClient } from '@supabase/supabase-js'
import { OutreachCampaign, OutreachTracking } from './types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export class OutreachAutomationService {
  // Create personalized outreach campaigns for each creator
  async createPersonalizedCampaigns() {
    try {
      // Get all active creators
      const { data: creators } = await supabase
        .from('profiles')
        .select(`
          *,
          creator_profiles!inner(profile_data)
        `)
        .eq('is_active', true)
        .not('creator_profiles', 'is', null)
      
      if (!creators) return
      
      for (const creator of creators) {
        await this.createCreatorCampaign(creator)
      }
    } catch (error) {
      console.error('Error creating personalized campaigns:', error)
    }
  }
  
  // Create campaign for individual creator
  private async createCreatorCampaign(creator: any) {
    const profileData = creator.creator_profiles[0]?.profile_data
    
    if (!profileData) return
    
    // Define campaign based on creator's profile
    const campaign: Partial<OutreachCampaign> = {
      name: `${creator.full_name} - Weekly Brand Outreach`,
      description: `Automated weekly outreach to brands matching ${creator.full_name}'s profile`,
      target_brand_criteria: {
        industries: this.getRelevantIndustries(profileData),
        follower_range: { min: 5000, max: 5000000 },
        locations: this.getTargetLocations(profileData),
        brand_values: profileData.identity?.values || []
      },
      creator_criteria: {
        niches: [creator.niche],
        follower_range: { 
          min: creator.follower_count * 0.5, 
          max: creator.follower_count * 2 
        },
        engagement_rate_min: Math.max(creator.engagement_rate - 1, 1),
        locations: profileData.analytics?.audienceDemographics?.topLocations?.map((l: any) => l.country)
      },
      status: 'active',
      daily_outreach_limit: this.calculateDailyLimit(creator),
      total_outreach_target: 50 // 50 brands per campaign
    }
    
    // Save campaign
    await supabase.from('outreach_campaigns').insert(campaign)
  }
  
  // Schedule daily outreach tasks
  async scheduleDailyOutreach() {
    try {
      // Get active campaigns
      const { data: campaigns } = await supabase
        .from('outreach_campaigns')
        .select('*')
        .eq('status', 'active')
      
      if (!campaigns) return
      
      for (const campaign of campaigns) {
        await this.scheduleOutreachForCampaign(campaign)
      }
    } catch (error) {
      console.error('Error scheduling daily outreach:', error)
    }
  }
  
  // Schedule outreach for specific campaign
  private async scheduleOutreachForCampaign(campaign: OutreachCampaign) {
    // Get today's scheduled outreach count
    const today = new Date().toISOString().split('T')[0]
    const { count: todayCount } = await supabase
      .from('outreach_tracking')
      .select('*', { count: 'exact' })
      .eq('campaign_id', campaign.id)
      .gte('scheduled_for', `${today}T00:00:00`)
      .lt('scheduled_for', `${today}T23:59:59`)
    
    const remainingSlots = campaign.daily_outreach_limit - (todayCount || 0)
    
    if (remainingSlots <= 0) return
    
    // Find best matches that haven't been contacted
    const { data: matches } = await supabase
      .from('brand_matches')
      .select(`
        *,
        brand:brands(*),
        outreach_tracking(*)
      `)
      .gte('match_score', 70)
      .is('outreach_tracking', null) // Not contacted yet
      .order('match_score', { ascending: false })
      .limit(remainingSlots)
    
    if (!matches) return
    
    // Schedule outreach for each match
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]
      const scheduledTime = this.calculateOptimalSendTime(match, i)
      
      await supabase.from('outreach_tracking').insert({
        match_id: match.id,
        campaign_id: campaign.id,
        outreach_status: 'scheduled',
        outreach_channel: this.selectOptimalChannel(match),
        scheduled_for: scheduledTime
      })
    }
  }
  
  // Process scheduled outreach
  async processScheduledOutreach() {
    try {
      const now = new Date()
      
      // Get outreach scheduled for now or earlier
      const { data: scheduledOutreach } = await supabase
        .from('outreach_tracking')
        .select(`
          *,
          match:brand_matches(
            *,
            brand:brands(*),
            profile:profiles(*)
          )
        `)
        .eq('outreach_status', 'scheduled')
        .lte('scheduled_for', now.toISOString())
      
      if (!scheduledOutreach) return
      
      for (const outreach of scheduledOutreach) {
        await this.sendOutreach(outreach)
      }
    } catch (error) {
      console.error('Error processing scheduled outreach:', error)
    }
  }
  
  // Send individual outreach
  private async sendOutreach(outreach: any) {
    try {
      // Generate personalized message
      const message = await this.generatePersonalizedMessage(outreach)
      
      // Send via appropriate channel
      if (outreach.outreach_channel === 'email') {
        await this.sendEmail(outreach, message)
      } else {
        await this.sendInstagramDM(outreach, message)
      }
      
      // Update status
      await supabase
        .from('outreach_tracking')
        .update({
          outreach_status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', outreach.id)
      
      // Schedule follow-up if needed
      await this.scheduleFollowUp(outreach)
    } catch (error) {
      console.error('Error sending outreach:', error)
    }
  }
  
  // Handle responses from brands
  async processResponses() {
    try {
      // This would integrate with email/Instagram APIs to check for responses
      // For now, we'll simulate the process
      
      const { data: sentOutreach } = await supabase
        .from('outreach_tracking')
        .select('*')
        .eq('outreach_status', 'sent')
        .lt('sent_at', new Date(Date.now() - 3600000).toISOString()) // At least 1 hour old
      
      if (!sentOutreach) return
      
      for (const outreach of sentOutreach) {
        const response = await this.checkForResponse(outreach)
        
        if (response) {
          await this.handleResponse(outreach, response)
        }
      }
    } catch (error) {
      console.error('Error processing responses:', error)
    }
  }
  
  // Handle brand response
  private async handleResponse(outreach: any, response: any) {
    // Analyze response sentiment and intent
    const analysis = await this.analyzeResponse(response)
    
    // Update tracking
    await supabase
      .from('outreach_tracking')
      .update({
        outreach_status: 'replied',
        replied_at: new Date().toISOString(),
        response_sentiment: analysis.sentiment,
        response_intent: analysis.intent
      })
      .eq('id', outreach.id)
    
    // Take action based on intent
    switch (analysis.intent) {
      case 'interested':
        await this.handleInterestedResponse(outreach, response)
        break
      case 'interested' as 'interested':
        await this.sendAdditionalInfo(outreach, response)
        break
      case 'interested' as 'interested':
        await this.markAsNotInterested(outreach)
        break
    }
  }
  
  // Schedule follow-up messages
  private async scheduleFollowUp(outreach: any) {
    // Only follow up on non-responded outreach
    const followUpDays = [3, 7, 14] // Follow up after 3, 7, and 14 days
    
    if (outreach.follow_up_count < followUpDays.length) {
      const daysUntilFollowUp = followUpDays[outreach.follow_up_count]
      const followUpDate = new Date()
      followUpDate.setDate(followUpDate.getDate() + daysUntilFollowUp)
      
      await supabase
        .from('outreach_tracking')
        .update({
          next_follow_up_date: followUpDate.toISOString().split('T')[0]
        })
        .eq('id', outreach.id)
    }
  }
  
  // Helper methods
  private getRelevantIndustries(profileData: any): string[] {
    const contentPillars = profileData.identity?.contentPillars || []
    const industryMap: Record<string, string[]> = {
      'Fashion': ['Fashion', 'Beauty', 'Accessories'],
      'Beauty': ['Beauty', 'Skincare', 'Cosmetics'],
      'Fitness': ['Fitness', 'Sports', 'Wellness'],
      'Food': ['Food', 'Beverage', 'Restaurant'],
      'Travel': ['Travel', 'Hospitality', 'Tourism'],
      'Tech': ['Technology', 'Software', 'Apps'],
      'Lifestyle': ['Lifestyle', 'Home', 'Wellness']
    }
    
    const industries = new Set<string>()
    contentPillars.forEach((pillar: string) => {
      const mapped = industryMap[pillar] || [pillar]
      mapped.forEach(industry => industries.add(industry))
    })
    
    return Array.from(industries)
  }
  
  private getTargetLocations(profileData: any): string[] {
    const audienceLocations = profileData.analytics?.audienceDemographics?.topLocations || []
    return audienceLocations
      .filter((loc: any) => loc.percentage > 10) // At least 10% of audience
      .map((loc: any) => loc.country)
  }
  
  private calculateDailyLimit(creator: any): number {
    // Higher tier creators get more daily outreach
    if (creator.follower_count > 100000) return 10
    if (creator.follower_count > 50000) return 7
    if (creator.follower_count > 10000) return 5
    return 3
  }
  
  private calculateOptimalSendTime(match: any, index: number): string {
    // Spread outreach throughout the day for natural appearance
    const baseHour = 9 // Start at 9 AM
    const hourOffset = index * 2 // 2 hours between each
    const sendHour = (baseHour + hourOffset) % 17 + 9 // Keep between 9 AM - 5 PM
    
    const sendTime = new Date()
    sendTime.setHours(sendHour, Math.floor(Math.random() * 60), 0, 0)
    
    return sendTime.toISOString()
  }
  
  private selectOptimalChannel(match: any): 'email' | 'instagram_dm' {
    // Prefer email for B2B brands, Instagram for lifestyle brands
    const b2bIndustries = ['Technology', 'Software', 'Services', 'B2B']
    
    if (b2bIndustries.includes(match.brand.industry)) {
      return 'email'
    }
    
    // Use Instagram for fashion, beauty, lifestyle brands
    return 'instagram_dm'
  }
  
  private async generatePersonalizedMessage(outreach: any) {
    // This would use the existing outreach generation API
    return {
      subject: 'Collaboration Opportunity',
      body: 'Personalized message here...'
    }
  }
  
  private async sendEmail(outreach: any, message: any) {
    // Integrate with email service (SendGrid, etc.)
    console.log('Sending email:', message)
  }
  
  private async sendInstagramDM(outreach: any, message: any) {
    // Integrate with Instagram API
    console.log('Sending Instagram DM:', message)
  }
  
  private async checkForResponse(outreach: any) {
    // Check email/Instagram for responses
    return null
  }
  
  private async analyzeResponse(response: any) {
    // Use AI to analyze response sentiment and intent
    return {
      sentiment: 'positive' as const,
      intent: 'interested' as const
    }
  }
  
  private async handleInterestedResponse(outreach: any, response: any) {
    // Create collaboration opportunity
    // Notify creator
    // Schedule meeting
  }
  
  private async sendAdditionalInfo(outreach: any, response: any) {
    // Send media kit, rates, etc.
  }
  
  private async markAsNotInterested(outreach: any) {
    // Update brand profile to not contact again for this creator
  }
}