'use client'

import { motion } from 'framer-motion'
import { MessageSquare, Mail, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function BrandMessagesPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        {/* Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <MessageSquare className="w-10 h-10 text-purple-600" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-display font-light text-gray-900 mb-4">
          Messaging Coming Soon
        </h1>

        {/* Description */}
        <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
          Once creators express interest in your briefs, you'll be able to communicate with them directly through our secure messaging system.
        </p>

        {/* How it works */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8 text-left max-w-lg mx-auto">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-600" />
            How messaging works
          </h3>
          <ol className="space-y-3 text-gray-600">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
              <span>Create a campaign brief with your requirements</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
              <span>Our AI matches you with relevant creators</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
              <span>Creators review and express interest</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">4</span>
              <span>Start messaging to discuss partnership details</span>
            </li>
          </ol>
        </div>

        {/* CTA */}
        <Link
          href="/brand/dashboard/briefs"
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
        >
          View Your Briefs
          <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </div>
  )
}
