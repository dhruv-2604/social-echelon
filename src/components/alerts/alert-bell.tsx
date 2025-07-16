'use client'

import { useState, useEffect } from 'react'
import { Bell, X, AlertTriangle, TrendingUp, TrendingDown, Info } from 'lucide-react'

interface Alert {
  id: string
  type: 'algorithm_change' | 'trend_alert' | 'performance_drop'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  data: any
  read: boolean
  created_at: string
}

export default function AlertBell() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [showAlerts, setShowAlerts] = useState(false)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchAlerts()
    // Poll for new alerts every minute
    const interval = setInterval(fetchAlerts, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts?unread=false')
      const data = await response.json()
      
      if (data.success) {
        setAlerts(data.alerts)
        setUnreadCount(data.alerts.filter((a: Alert) => !a.read).length)
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (alertId: string) => {
    try {
      await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds: [alertId] })
      })
      
      setAlerts(alerts.map(a => 
        a.id === alertId ? { ...a, read: true } : a
      ))
      setUnreadCount(Math.max(0, unreadCount - 1))
    } catch (error) {
      console.error('Error marking alert as read:', error)
    }
  }

  const markAllAsRead = async () => {
    const unreadIds = alerts.filter(a => !a.read).map(a => a.id)
    if (unreadIds.length === 0) return
    
    try {
      await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds: unreadIds })
      })
      
      setAlerts(alerts.map(a => ({ ...a, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking alerts as read:', error)
    }
  }

  const getAlertIcon = (type: Alert['type'], severity: Alert['severity']) => {
    if (type === 'algorithm_change') {
      if (severity === 'critical' || severity === 'high') {
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      }
      return <Info className="w-5 h-5 text-blue-500" />
    }
    if (type === 'performance_drop') {
      return <TrendingDown className="w-5 h-5 text-orange-500" />
    }
    return <TrendingUp className="w-5 h-5 text-green-500" />
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <div className="relative">
      {/* Alert Bell */}
      <button
        onClick={() => setShowAlerts(!showAlerts)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Alert Dropdown */}
      {showAlerts && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowAlerts(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                Loading alerts...
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !alert.read ? 'bg-purple-50' : ''
                    }`}
                    onClick={() => !alert.read && markAsRead(alert.id)}
                  >
                    <div className="flex gap-3">
                      {getAlertIcon(alert.type, alert.severity)}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-gray-900">
                            {alert.title}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(alert.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                          {alert.message}
                        </p>
                        {!alert.read && (
                          <span className="inline-block mt-2 text-xs text-purple-600 font-medium">
                            • New
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {alerts.length > 3 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <a
                href="/alerts"
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}