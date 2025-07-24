'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Mail, Copy, Edit2, Send, ChevronLeft, Sparkles, 
  AlertCircle, CheckCircle, Loader2, Instagram, User, BookOpen
} from 'lucide-react'
import OutreachGuide from '@/components/OutreachGuide'

interface OutreachData {
  match: any
  creator: any
  emailDraft: {
    subject: string
    body: string
    personalizationPoints: string[]
  }
  dmDraft: {
    message: string
    personalizationPoints: string[]
  }
}

export default function OutreachPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.matchId as string
  
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<OutreachData | null>(null)
  const [selectedMode, setSelectedMode] = useState<'email' | 'dm'>('email')
  const [editMode, setEditMode] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [copying, setCopying] = useState(false)
  const [profileUrl, setProfileUrl] = useState('')
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    fetchOutreachData()
  }, [matchId])

  async function fetchOutreachData() {
    try {
      const response = await fetch(`/api/brand-matching/outreach/${matchId}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result)
        setSubject(result.emailDraft.subject)
        setMessage(selectedMode === 'email' ? result.emailDraft.body : result.dmDraft.message)
        
        // Generate profile URL
        const baseUrl = window.location.origin
        setProfileUrl(`${baseUrl}/creator/${result.creator.instagram_username}`)
      }
    } catch (error) {
      console.error('Error fetching outreach data:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleModeChange(mode: 'email' | 'dm') {
    setSelectedMode(mode)
    if (data) {
      setMessage(mode === 'email' ? data.emailDraft.body : data.dmDraft.message)
    }
    setEditMode(false)
  }

  async function copyToClipboard(text: string) {
    setCopying(true)
    try {
      await navigator.clipboard.writeText(text)
      setTimeout(() => setCopying(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      setCopying(false)
    }
  }

  async function markAsSent() {
    try {
      await fetch(`/api/brand-matching/outreach/${matchId}/sent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          channel: selectedMode,
          subject: selectedMode === 'email' ? subject : undefined,
          message 
        })
      })
      
      router.push('/dashboard/brand-opportunities')
    } catch (error) {
      console.error('Error marking as sent:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Generating personalized outreach...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold">Failed to load outreach data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Outreach to {data.match.brand.name}
                </h1>
                <p className="text-sm text-gray-600">
                  {data.match.overallScore}% match • {data.match.insights.estimatedResponseRate}% response rate
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Mode Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Choose Outreach Method</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleModeChange('email')}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedMode === 'email'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Mail className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <h3 className="font-medium text-gray-900">Email</h3>
              <p className="text-sm text-gray-600 mt-1">Professional outreach via email</p>
            </button>

            <button
              onClick={() => handleModeChange('dm')}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedMode === 'dm'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Instagram className="w-8 h-8 mx-auto mb-2 text-pink-600" />
              <h3 className="font-medium text-gray-900">Instagram DM</h3>
              <p className="text-sm text-gray-600 mt-1">Quick and casual via DM</p>
            </button>
          </div>
        </div>

        {/* Profile Link Section */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-purple-900 mb-1">Your Social Echelon Profile Link</h3>
              <p className="text-sm text-purple-700 mb-2">
                Share this link instead of attaching a media kit. Brands love the professional presentation!
              </p>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-white px-3 py-2 rounded text-sm text-gray-700 border border-purple-200">
                  {profileUrl}
                </code>
                <button
                  onClick={() => copyToClipboard(profileUrl)}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  {copying ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Draft Content */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">
              {selectedMode === 'email' ? 'Email Draft' : 'DM Draft'}
            </h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setEditMode(!editMode)}
                className="flex items-center space-x-2 text-purple-600 hover:text-purple-700"
              >
                <Edit2 className="w-4 h-4" />
                <span>{editMode ? 'Preview' : 'Edit'}</span>
              </button>
              <button
                onClick={() => setShowGuide(true)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-700"
              >
                <BookOpen className="w-4 h-4" />
                <span>Outreach Guide</span>
              </button>
            </div>
          </div>

          {/* Subject Line (Email Only) */}
          {selectedMode === 'email' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Line
              </label>
              {editMode ? (
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg text-gray-900">{subject}</div>
              )}
            </div>
          )}

          {/* Message Body */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            {editMode ? (
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={selectedMode === 'email' ? 12 : 6}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg whitespace-pre-wrap text-gray-900">
                {message}
              </div>
            )}
          </div>

          {/* Personalization Points */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Personalization Highlights</h3>
            <div className="flex flex-wrap gap-2">
              {(selectedMode === 'email' ? data.emailDraft : data.dmDraft).personalizationPoints.map((point: string, index: number) => (
                <span key={index} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  ✓ {point}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Info */}
        {data.match.brand.contact_email && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Contact Information</h3>
            <div className="space-y-2 text-sm">
              {data.match.brand.contact_name && (
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Contact:</span>
                  <span className="text-gray-900">{data.match.brand.contact_name}</span>
                </div>
              )}
              {selectedMode === 'email' && data.match.brand.contact_email && (
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Email:</span>
                  <span className="text-gray-900">{data.match.brand.contact_email}</span>
                </div>
              )}
              {selectedMode === 'dm' && data.match.brand.instagram_handle && (
                <div className="flex items-center space-x-2">
                  <Instagram className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Instagram:</span>
                  <span className="text-gray-900">{data.match.brand.instagram_handle}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => copyToClipboard(selectedMode === 'email' ? `Subject: ${subject}\n\n${message}` : message)}
            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Copy className="w-5 h-5" />
            <span>Copy {selectedMode === 'email' ? 'Email' : 'DM'}</span>
          </button>

          <button
            onClick={markAsSent}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Send className="w-5 h-5" />
            <span>Mark as Sent</span>
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Next Steps:</h3>
          <ol className="space-y-2 text-sm text-blue-800">
            <li>1. Copy the {selectedMode === 'email' ? 'email content' : 'DM'} above</li>
            <li>2. {selectedMode === 'email' 
              ? `Send to ${data.match.brand.contact_email || 'the brand\'s email'}`
              : `Send via Instagram DM to ${data.match.brand.instagram_handle || 'the brand'}`}
            </li>
            <li>3. Include your Social Echelon profile link: {profileUrl}</li>
            <li>4. Click "Mark as Sent" to track your outreach</li>
          </ol>
        </div>
      </div>

      {/* Outreach Guide Modal */}
      {showGuide && (
        <OutreachGuide onClose={() => setShowGuide(false)} />
      )}
    </div>
  )
}