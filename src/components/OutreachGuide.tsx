'use client'

import { X, MessageSquare, Target, Sparkles, Users } from 'lucide-react'

interface OutreachGuideProps {
  onClose: () => void
}

export default function OutreachGuide({ onClose }: OutreachGuideProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">How to Pitch Yourself to Brands</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Main Principle */}
          <section className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
            <h3 className="text-lg font-semibold mb-2 text-blue-900">The Golden Rule</h3>
            <p className="text-blue-800">
              Keep your initial outreach <strong>short and sweet</strong>. Let the brand know why you're 
              reaching out and how they can follow up with you. The goal is to start a conversation, 
              not close a deal in the first message.
            </p>
          </section>

          {/* What to Include */}
          <section>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-gray-600" />
              What to Include in Your Pitch
            </h3>
            
            <div className="space-y-4">
              <div className="border-l-4 border-gray-300 pl-4">
                <h4 className="font-semibold text-gray-900">1. Short Intro</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Introduce who you are and what you do, but keep it to one sentence. 
                  Focus on what's relevant to the brand.
                </p>
              </div>

              <div className="border-l-4 border-gray-300 pl-4">
                <h4 className="font-semibold text-gray-900">2. Purpose of Contact</h4>
                <p className="text-sm text-gray-600 mt-1">
                  You're looking for a partnership, but let the brand know why you chose 
                  <strong> them specifically</strong>. Show you've done your research.
                </p>
              </div>

              <div className="border-l-4 border-gray-300 pl-4">
                <h4 className="font-semibold text-gray-900">3. Value Proposition</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Make sure the brand knows exactly what you bring to the table. Be specific 
                  about your audience and content style.
                </p>
              </div>

              <div className="border-l-4 border-gray-300 pl-4">
                <h4 className="font-semibold text-gray-900">4. Clear CTA</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Close with a clear call to action, so the brand knows how to follow up. 
                  Keep it low-pressure.
                </p>
              </div>

              <div className="border-l-4 border-purple-500 pl-4 bg-purple-50 p-4 rounded-r">
                <h4 className="font-semibold text-purple-900">5. Social Echelon Profile</h4>
                <p className="text-sm text-purple-800 mt-1">
                  Always include a link to your Social Echelon creator profile. It contains all 
                  the information a brand needs - your metrics, content examples, audience insights, 
                  and more. It's your professional media kit that updates automatically.
                </p>
              </div>
            </div>
          </section>

          {/* Template Examples */}
          <section>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              Proven Outreach Templates
            </h3>

            <div className="space-y-6">
              {/* Direct Approach */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  Direct Approach
                </h4>
                <div className="bg-white p-4 rounded border border-gray-200 text-sm space-y-2">
                  <p>Hey [Brand Name] team!</p>
                  <p>I'm [Your Name], a [brief description, e.g., fitness content creator], and I absolutely love your [specific product].</p>
                  <p>It's been a game-changer for me, and I'd love to share my passion for it with my followers.</p>
                  <p>Do you have some time to chat about how we can showcase your amazing products together?</p>
                  <p className="text-purple-600">PS – Feel free to check out my Social Echelon profile to get a better feel for engagement metrics and content style.</p>
                  <p>Cheers,<br/>[Your Name]</p>
                </div>
              </div>

              {/* Storytelling Approach */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-green-500" />
                  Storytelling Approach
                </h4>
                <div className="bg-white p-4 rounded border border-gray-200 text-sm space-y-2">
                  <p>Hi [Brand Name] team,</p>
                  <p>I'm [Your Name], a [brief description, e.g., lifestyle blogger and content creator].</p>
                  <p>Your [specific product] has truly transformed my daily routine, and I'd love to share this journey with my audience.</p>
                  <p>I believe that together, we can create a compelling narrative around how your product helps people achieve [specific goal].</p>
                  <p>Let's discuss how we can bring this story to life!</p>
                  <p className="text-purple-600">PS – Feel free to check out my Social Echelon profile to get a better feel for engagement metrics and content style.</p>
                  <p>Best,<br/>[Your Name]</p>
                </div>
              </div>

              {/* Audience Insights */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Audience Insights Approach
                </h4>
                <div className="bg-white p-4 rounded border border-gray-200 text-sm space-y-2">
                  <p>Hi [Brand Contact Name],</p>
                  <p>I'm [Your Name], a [brief description, e.g., tech influencer and YouTuber], and I've been closely following [Brand Name]'s innovations.</p>
                  <p>My audience consists primarily of [demographic], who are always looking for [specific benefit your product offers]. I'm confident that we can create content that not only engages my audience but also drives value for your brand.</p>
                  <p>Could we schedule a call to explore this potential partnership?</p>
                  <p className="text-purple-600">PS – Feel free to check out my Social Echelon profile to get a better feel for engagement metrics and content style.</p>
                  <p>Looking forward to your response!</p>
                  <p>Best regards,<br/>[Your Name]</p>
                </div>
              </div>
            </div>
          </section>

          {/* Why Social Echelon */}
          <section className="bg-purple-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3 text-purple-900">
              Why Include Your Social Echelon Profile?
            </h3>
            <div className="space-y-2 text-sm text-purple-800">
              <p>
                Your Social Echelon creator profile is more than just a media kit - it's your 
                professional creator identity that:
              </p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Updates automatically with your latest metrics and content</li>
                <li>Shows verified audience demographics and engagement rates</li>
                <li>Highlights your past brand collaborations and successes</li>
                <li>Makes it easy for brands to understand your value proposition</li>
                <li>Positions you as a professional creator who takes partnerships seriously</li>
              </ul>
              <p className="mt-3">
                As Social Echelon grows, brands will start discovering creators directly on our 
                platform, opening up even more opportunities for you.
              </p>
            </div>
          </section>

          {/* Quick Tips */}
          <section className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Reminders</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-green-600 mb-2">✓ DO:</p>
                <ul className="space-y-1 text-gray-600">
                  <li>• Personalize every message</li>
                  <li>• Research the brand first</li>
                  <li>• Keep it under 150 words</li>
                  <li>• Include your Social Echelon profile</li>
                  <li>• Follow up once after a week</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-red-600 mb-2">✗ DON'T:</p>
                <ul className="space-y-1 text-gray-600">
                  <li>• Send mass generic emails</li>
                  <li>• Write long paragraphs</li>
                  <li>• Negotiate rates upfront</li>
                  <li>• Forget to proofread</li>
                  <li>• Be pushy or desperate</li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 bg-gray-50 p-6 border-t">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Start Crafting Your Pitch
          </button>
        </div>
      </div>
    </div>
  )
}