import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { AlgorithmChange } from './anomaly-detector'

export interface AlertConfig {
  user_id: string
  email_alerts: boolean
  sms_alerts: boolean
  in_app_alerts: boolean
  alert_threshold: 'all' | 'high' | 'critical'
  email?: string
  phone?: string
}

export interface Alert {
  id: string
  user_id: string
  type: 'algorithm_change' | 'trend_alert' | 'performance_drop'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  data: any
  read: boolean
  created_at: string
}

export class AlertManager {
  /**
   * Send alerts to affected users about algorithm changes
   */
  async sendAlgorithmChangeAlerts(changes: AlgorithmChange[]): Promise<void> {
    console.log(`Sending alerts for ${changes.length} algorithm changes...`)
    
    const supabaseAdmin = getSupabaseAdmin()
    
    for (const change of changes) {
      // Only alert for significant changes
      if (change.confidence < 70) continue
      
      const severity = this.determineSeverity(change)
      const { title, message } = this.formatAlgorithmAlert(change)
      
      // Get affected users who have alerts enabled
      const { data: affectedUsers } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .in('niche', change.niches) as { data: Array<{id: string; email: string}> | null; error: any }
      
      if (!affectedUsers || affectedUsers.length === 0) continue
      
      // Create in-app alerts for all affected users
      const alerts = affectedUsers.map(user => ({
        user_id: user.id,
        type: 'algorithm_change' as const,
        severity,
        title,
        message,
        data: {
          change_type: change.type,
          metric: change.metric,
          percent_change: change.percentChange,
          recommendations: change.recommendations
        },
        read: false,
        created_at: new Date().toISOString()
      }))
      
      await supabaseAdmin
        .from('alerts')
        .insert(alerts)
      
      // For high severity changes, also send emails (in production)
      if (severity === 'high' || severity === 'critical') {
        console.log(`Would send email alerts to ${affectedUsers.length} users`)
        // In production: await this.sendEmailAlerts(affectedUsers, title, message)
      }
    }
  }
  
  /**
   * Determine alert severity based on change impact
   */
  private determineSeverity(change: AlgorithmChange): Alert['severity'] {
    const impactScore = Math.abs(change.percentChange) * (change.confidence / 100)
    
    if (impactScore > 50) return 'critical'
    if (impactScore > 30) return 'high'
    if (impactScore > 15) return 'medium'
    return 'low'
  }
  
  /**
   * Format algorithm change into user-friendly alert
   */
  private formatAlgorithmAlert(change: AlgorithmChange): { title: string; message: string } {
    const direction = change.percentChange > 0 ? 'increased' : 'decreased'
    const absChange = Math.abs(change.percentChange).toFixed(0)
    
    const titles: Record<typeof change.type, string> = {
      reach_drop: '⚠️ Instagram Reach Alert',
      reach_increase: '📈 Instagram Reach Boost Detected',
      engagement_shift: '🔄 Engagement Pattern Change',
      format_preference: '🎯 Content Format Update'
    }
    
    const title = titles[change.type]
    
    let message = `Instagram's algorithm has ${direction} ${change.metric} by ${absChange}% `
    message += `across ${change.affectedUsers} users in your niche. `
    
    if (change.recommendations.length > 0) {
      message += '\n\nRecommendations:\n'
      message += change.recommendations.map(r => `• ${r}`).join('\n')
    }
    
    return { title, message }
  }
  
  /**
   * Get unread alerts for a user
   */
  async getUserAlerts(userId: string, unreadOnly = false): Promise<Alert[]> {
    const supabaseAdmin = getSupabaseAdmin()
    
    let query = supabaseAdmin
      .from('alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (unreadOnly) {
      query = query.eq('read', false)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching alerts:', error)
      return []
    }
    
    return data || []
  }
  
  /**
   * Mark alerts as read
   */
  async markAlertsAsRead(alertIds: string[]): Promise<void> {
    const supabaseAdmin = getSupabaseAdmin()
    
    await supabaseAdmin
      .from('alerts')
      .update({ read: true })
      .in('id', alertIds)
  }
  
  /**
   * Get alert statistics for dashboard
   */
  async getAlertStats(userId: string): Promise<{
    unreadCount: number
    criticalCount: number
    recentAlerts: Alert[]
  }> {
    const alerts = await this.getUserAlerts(userId)
    
    return {
      unreadCount: alerts.filter(a => !a.read).length,
      criticalCount: alerts.filter(a => a.severity === 'critical' && !a.read).length,
      recentAlerts: alerts.slice(0, 5)
    }
  }
}