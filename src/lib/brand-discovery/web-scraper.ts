import { getSupabaseAdmin } from '@/lib/supabase-admin'
import * as cheerio from 'cheerio'
import { ScrapingSource, ScrapedOpportunity } from './scraper-types'

export class BrandOpportunityScraper {
  private userAgent = 'Mozilla/5.0 (compatible; SocialEchelonBot/1.0; +https://socialechelon.com/bot)'
  
  /**
   * Main method to run daily scraping
   */
  async runDailyScraping() {
    console.log('Starting daily brand opportunity scraping...')
    
    try {
      // Get active scraping sources
      const supabase = getSupabaseAdmin()
      const { data: sources } = await supabase
        .from('scraping_sources')
        .select('*')
        .eq('is_active', true)
        .lte('next_scrape_at', new Date().toISOString()) as { data: ScrapingSource[] | null; error: any }
      
      if (!sources || sources.length === 0) {
        console.log('No sources ready for scraping')
        return
      }
      
      const results = []
      
      for (const source of sources) {
        const logId = await this.startScrapingLog(source.id as string)
        
        try {
          const opportunities = await this.scrapeSource(source)
          await this.completeScrapingLog(logId, opportunities.length)
          results.push({ source: source.source_name, opportunities: opportunities.length })
          
          // Update next scrape time
          await this.updateNextScrapeTime(source.id as string, source.scraping_frequency as string)
          
        } catch (error) {
          await this.failScrapingLog(logId, error instanceof Error ? error.message : 'Unknown error')
          console.error(`Error scraping ${source.source_name}:`, error)
        }
      }
      
      // Process new opportunities
      await this.processNewOpportunities()
      
      return results
      
    } catch (error) {
      console.error('Error in daily scraping:', error)
      throw error
    }
  }
  
  /**
   * Scrape a specific source
   */
  private async scrapeSource(source: ScrapingSource): Promise<any[]> {
    console.log(`Scraping ${source.source_name}...`)
    
    const opportunities = []
    
    switch (source.source_type) {
      case 'pr_newswire':
        opportunities.push(...await this.scrapePRNewswire(source))
        break
      case 'marketing_blog':
        opportunities.push(...await this.scrapeMarketingBlog(source))
        break
      case 'brand_website':
        opportunities.push(...await this.scrapeBrandWebsite(source))
        break
      case 'social_media':
        opportunities.push(...await this.scrapeLinkedIn(source))
        break
      default:
        console.log(`Unsupported source type: ${source.source_type}`)
    }
    
    // Save opportunities to database
    for (const opp of opportunities) {
      await this.saveOpportunity(source.id, opp)
    }
    
    return opportunities
  }
  
  /**
   * Scrape PR Newswire for influencer marketing announcements
   */
  private async scrapePRNewswire(source: ScrapingSource): Promise<any[]> {
    try {
      const response = await fetch(source.source_url, {
        headers: { 'User-Agent': this.userAgent }
      })
      const html = await response.text()
      const $ = cheerio.load(html)
      
      const opportunities: any[] = []
      const keywords = await this.getActiveKeywords()
      
      // Look for press releases mentioning our keywords
      $('.news-release').each((_, element) => {
        const title = $(element).find('.news-release-title').text().trim()
        const link = $(element).find('.news-release-title a').attr('href')
        const date = $(element).find('.news-release-date').text().trim()
        
        // Check if title contains any of our keywords
        const matchedKeyword = keywords.find((kw: any) => 
          title.toLowerCase().includes((kw.keyword as string).toLowerCase())
        )
        
        if (matchedKeyword) {
          opportunities.push({
            title,
            url: `https://www.prnewswire.com${link}`,
            published_date: this.parseDate(date),
            opportunity_type: this.determineOpportunityType(title),
            brand_name: this.extractBrandName(title),
            description: title
          })
        }
      })
      
      return opportunities
      
    } catch (error) {
      console.error('Error scraping PR Newswire:', error)
      return []
    }
  }
  
  /**
   * Scrape marketing blogs for campaign announcements
   */
  private async scrapeMarketingBlog(source: ScrapingSource): Promise<any[]> {
    try {
      const response = await fetch(source.source_url, {
        headers: { 'User-Agent': this.userAgent }
      })
      const html = await response.text()
      const $ = cheerio.load(html)
      
      const opportunities: any[] = []
      const selectors = source.selectors as any
      
      $(selectors.title).each((_, element) => {
        const title = $(element).text().trim()
        const link = $(element).find('a').attr('href') || $(element).attr('href')
        
        // Only process if it mentions influencer/creator keywords
        if (this.containsOpportunityKeywords(title)) {
          opportunities.push({
            title,
            url: this.normalizeUrl(link || '', source.source_url),
            opportunity_type: 'campaign_announcement',
            brand_name: this.extractBrandName(title),
            description: $(element).siblings(selectors.excerpt).text().trim()
          })
        }
      })
      
      return opportunities
      
    } catch (error) {
      console.error(`Error scraping ${source.source_name}:`, error)
      return []
    }
  }
  
  /**
   * Scrape brand websites for creator program pages
   */
  private async scrapeBrandWebsite(source: ScrapingSource): Promise<any[]> {
    try {
      const response = await fetch(source.source_url, {
        headers: { 'User-Agent': this.userAgent }
      })
      const html = await response.text()
      const $ = cheerio.load(html)
      
      const opportunities: any[] = []
      
      // Look for application forms, deadlines, requirements
      const pageText = $('body').text().toLowerCase()
      
      if (pageText.includes('apply now') || pageText.includes('applications open')) {
        // Extract brand name from URL
        const brandName = this.extractBrandFromUrl(source.source_url)
        
        opportunities.push({
          title: `${brandName} Creator Program Applications Open`,
          url: source.source_url,
          opportunity_type: 'open_application',
          brand_name: brandName,
          description: this.extractProgramDetails($),
          creator_requirements: this.extractRequirements($),
          contact_info: this.extractContactInfo($)
        })
      }
      
      return opportunities
      
    } catch (error) {
      console.error(`Error scraping brand website ${source.source_url}:`, error)
      return []
    }
  }
  
  /**
   * Scrape LinkedIn for influencer marketing job postings
   */
  private async scrapeLinkedIn(source: ScrapingSource): Promise<any[]> {
    // Note: LinkedIn has anti-scraping measures, so this would need to use their API
    // or a headless browser with proper rate limiting
    // For now, returning empty array
    return []
  }
  
  /**
   * Extract brand name from title or URL
   */
  private extractBrandName(text: string): string {
    // Look for patterns like "Nike announces...", "Sephora launches..."
    const patterns = [
      /^(\w+)\s+(announces|launches|introduces|unveils)/i,
      /^(\w+)'s\s+new/i,
      /by\s+(\w+)$/i
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        return match[1]
      }
    }
    
    // Fallback: take first capitalized word
    const words = text.split(' ')
    return words.find(w => w[0] === w[0].toUpperCase()) || 'Unknown Brand'
  }
  
  /**
   * Determine opportunity type from content
   */
  private determineOpportunityType(text: string): string {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('budget') || lowerText.includes('invest')) {
      return 'budget_announcement'
    }
    if (lowerText.includes('hire') || lowerText.includes('hiring') || lowerText.includes('joins')) {
      return 'team_change'
    }
    if (lowerText.includes('launch') || lowerText.includes('introduce')) {
      return 'product_launch'
    }
    if (lowerText.includes('program') || lowerText.includes('applications')) {
      return 'program_launch'
    }
    
    return 'campaign_announcement'
  }
  
  /**
   * Check if text contains opportunity keywords
   */
  private containsOpportunityKeywords(text: string): boolean {
    const keywords = [
      'influencer', 'creator', 'ambassador', 'partnership',
      'campaign', 'program', 'collaboration', 'sponsored'
    ]
    
    const lowerText = text.toLowerCase()
    return keywords.some(kw => lowerText.includes(kw))
  }
  
  /**
   * Extract program requirements from page
   */
  private extractRequirements($: cheerio.CheerioAPI): any {
    const requirements: {
      followers: { min: number | null, max: number | null },
      engagement_rate: number | null,
      niches: string[],
      locations: string[]
    } = {
      followers: { min: null, max: null },
      engagement_rate: null,
      niches: [],
      locations: []
    }
    
    // Look for common requirement patterns
    const text = $('body').text()
    
    // Follower requirements
    const followerMatch = text.match(/(\d+[kK]?)\+?\s*followers/i)
    if (followerMatch) {
      requirements.followers.min = this.parseFollowerCount(followerMatch[1])
    }
    
    // Engagement rate
    const engagementMatch = text.match(/(\d+\.?\d*)%\s*engagement/i)
    if (engagementMatch) {
      requirements.engagement_rate = parseFloat(engagementMatch[1])
    }
    
    return requirements
  }
  
  /**
   * Extract contact information
   */
  private extractContactInfo($: cheerio.CheerioAPI): any {
    const contact: {
      email: string | null,
      form_url: string | null
    } = {
      email: null,
      form_url: null
    }
    
    // Look for email addresses
    const emailMatch = $('body').html()?.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
    if (emailMatch) {
      // Filter for relevant emails (containing keywords like creator, influencer, pr, partnership)
      const relevantEmail = emailMatch.find(email => 
        /creator|influencer|pr|partnership|collab/i.test(email)
      )
      contact.email = relevantEmail || emailMatch[0]
    }
    
    // Look for application forms
    const formLink = $('a[href*="apply"], a[href*="application"], button:contains("Apply")').attr('href')
    if (formLink) {
      contact.form_url = formLink
    }
    
    return contact
  }
  
  /**
   * Save opportunity to database
   */
  private async saveOpportunity(sourceId: string, opportunity: any) {
    try {
      const supabase = getSupabaseAdmin()
      const { error } = await supabase
        .from('scraped_opportunities')
        .insert({
          source_id: sourceId,
          ...opportunity,
          relevance_score: this.calculateRelevanceScore(opportunity),
          created_at: new Date().toISOString()
        })
      
      if (error && !error.message.includes('duplicate')) {
        console.error('Error saving opportunity:', error)
      }
    } catch (error) {
      console.error('Error saving opportunity:', error)
    }
  }
  
  /**
   * Calculate relevance score for an opportunity
   */
  private calculateRelevanceScore(opportunity: any): number {
    let score = 0.5 // Base score
    
    // Higher score for open applications
    if (opportunity.opportunity_type === 'open_application') {
      score += 0.2
    }
    
    // Higher score if requirements are specified
    if (opportunity.creator_requirements) {
      score += 0.1
    }
    
    // Higher score if contact info is available
    if (opportunity.contact_info?.email || opportunity.contact_info?.form_url) {
      score += 0.2
    }
    
    return Math.min(score, 1)
  }
  
  /**
   * Process new opportunities and queue brands for research
   */
  private async processNewOpportunities() {
    const supabase = getSupabaseAdmin()
    const { data: newOpps } = await supabase
      .from('scraped_opportunities')
      .select('*')
      .eq('status', 'new')
      .order('relevance_score', { ascending: false })
      .limit(50) as { data: any[] | null; error: any }
    
    if (!newOpps || newOpps.length === 0) return
    
    for (const opp of newOpps) {
      // Queue brand for research if not already in our database
      await this.queueBrandForResearch(opp.brand_name as string, opp.brand_website as string)
      
      // Update status to qualified or irrelevant
      const status = (opp.relevance_score as number) > 0.5 ? 'qualified' : 'irrelevant'
      const supabase = getSupabaseAdmin()
      await supabase
        .from('scraped_opportunities')
        .update({ status })
        .eq('id', opp.id as string)
    }
  }
  
  /**
   * Queue a brand for detailed research
   */
  private async queueBrandForResearch(brandName: string, website?: string) {
    if (!brandName || brandName === 'Unknown Brand') return
    
    try {
      const supabase = getSupabaseAdmin()
      await supabase
        .from('scraping_brand_queue')
        .insert({
          brand_name: brandName,
          brand_website: website,
          priority: 5
        })
    } catch (error) {
      // Ignore duplicates
    }
  }
  
  // Helper methods
  
  private async getActiveKeywords() {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('scraping_keywords')
      .select('*')
      .eq('is_active', true)
    
    return data || []
  }
  
  private parseFollowerCount(text: string): number {
    const num = parseFloat(text.replace(/[^0-9.]/g, ''))
    if (text.toLowerCase().includes('k')) {
      return num * 1000
    }
    if (text.toLowerCase().includes('m')) {
      return num * 1000000
    }
    return num
  }
  
  private normalizeUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http')) return url
    if (url.startsWith('/')) {
      const base = new URL(baseUrl)
      return `${base.protocol}//${base.host}${url}`
    }
    return `${baseUrl}/${url}`
  }
  
  private extractBrandFromUrl(url: string): string {
    const domain = new URL(url).hostname
    const parts = domain.split('.')
    return parts[parts.length - 2] // Get domain name without TLD
  }
  
  private parseDate(dateStr: string): string {
    try {
      return new Date(dateStr).toISOString().split('T')[0]
    } catch {
      return new Date().toISOString().split('T')[0]
    }
  }
  
  private extractProgramDetails($: cheerio.CheerioAPI): string {
    // Look for program description in common selectors
    const selectors = [
      '.program-description',
      '.about-program',
      '.creator-program-info',
      '[data-program-info]'
    ]
    
    for (const selector of selectors) {
      const text = $(selector).text().trim()
      if (text.length > 50) return text
    }
    
    // Fallback: get first substantial paragraph
    const firstPara = $('p').filter((_, el) => $(el).text().length > 100).first().text()
    return firstPara || 'Creator program details available on website'
  }
  
  private async startScrapingLog(sourceId: string): Promise<string> {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('scraping_logs')
      .insert({
        source_id: sourceId,
        started_at: new Date().toISOString(),
        status: 'running'
      })
      .select('id')
      .single() as { data: { id: string } | null; error: any }
    
    return data?.id || ''
  }
  
  private async completeScrapingLog(logId: string, opportunitiesFound: number) {
    const supabase = getSupabaseAdmin()
    await supabase
      .from('scraping_logs')
      .update({
        completed_at: new Date().toISOString(),
        opportunities_found: opportunitiesFound,
        status: 'completed'
      })
      .eq('id', logId)
  }
  
  private async failScrapingLog(logId: string, error: string) {
    const supabase = getSupabaseAdmin()
    await supabase
      .from('scraping_logs')
      .update({
        completed_at: new Date().toISOString(),
        error_message: error,
        status: 'failed'
      })
      .eq('id', logId)
  }
  
  private async updateNextScrapeTime(sourceId: string, frequency: string) {
    const nextTime = new Date()
    
    switch (frequency) {
      case 'hourly':
        nextTime.setHours(nextTime.getHours() + 1)
        break
      case 'daily':
        nextTime.setDate(nextTime.getDate() + 1)
        break
      case 'weekly':
        nextTime.setDate(nextTime.getDate() + 7)
        break
      default:
        nextTime.setDate(nextTime.getDate() + 1)
    }
    
    const supabase = getSupabaseAdmin()
    await supabase
      .from('scraping_sources')
      .update({
        last_scraped_at: new Date().toISOString(),
        next_scrape_at: nextTime.toISOString()
      })
      .eq('id', sourceId)
  }
}