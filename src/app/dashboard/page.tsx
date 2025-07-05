import { Instagram, TrendingUp, Target, Calendar, DollarSign, Users } from 'lucide-react'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SE</span>
              </div>
              <span className="font-bold text-xl text-gray-900">Social Echelon</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Instagram className="w-5 h-5 text-pink-500" />
                <span className="text-sm text-gray-600">@username</span>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back! 👋</h1>
          <p className="text-gray-600">Here's what's happening with your Instagram growth today.</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-green-600">+5.2%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">12.5K</div>
            <div className="text-sm text-gray-600">Followers</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-pink-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-pink-600" />
              </div>
              <span className="text-sm font-medium text-green-600">+12.1%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">4.8%</div>
            <div className="text-sm text-gray-600">Engagement Rate</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">This Month</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">24</div>
            <div className="text-sm text-gray-600">Posts Published</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm font-medium text-green-600">+$450</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">$1,200</div>
            <div className="text-sm text-gray-600">Monthly Revenue</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Action Center */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Today's AI Recommendations</h2>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
                  3 tasks
                </span>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-100">
                  <div className="w-2 h-2 bg-pink-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Post a carousel about your morning routine</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Based on your audience engagement, lifestyle content performs 23% better on Thursdays.
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs font-medium rounded">High Priority</span>
                      <span className="text-xs text-gray-500">Best time: 2:30 PM</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Engage with @fitnessbrand's latest post</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      This brand aligns with your niche and has 89% compatibility for partnerships.
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">Partnership</span>
                      <span className="text-xs text-gray-500">Est. value: $200-400</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Update your bio with trending keywords</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Add "wellness coach" and "mindful living" to improve discoverability by 15%.
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">SEO</span>
                      <span className="text-xs text-gray-500">2 min task</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Calendar */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">This Week's Content</h2>
                <button className="text-purple-600 hover:text-purple-700 font-medium text-sm">
                  View Full Calendar
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-gradient-to-r from-pink-400 to-purple-400 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Morning Workout Routine</div>
                    <div className="text-sm text-gray-600">Today, 2:30 PM • Carousel Post</div>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Scheduled</span>
                </div>

                <div className="flex items-center space-x-4 p-3 border border-dashed border-gray-200 rounded-lg">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-600">Weekend Meal Prep Tips</div>
                    <div className="text-sm text-gray-500">Tomorrow, 11:00 AM • Video Post</div>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">Draft</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Growth Chart */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Growth This Month</h3>
              <div className="h-32 bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-500 text-sm">Chart visualization would go here</span>
              </div>
              <div className="mt-4 text-center">
                <div className="text-2xl font-bold text-green-600">+847</div>
                <div className="text-sm text-gray-600">New followers this month</div>
              </div>
            </div>

            {/* Brand Opportunities */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Brand Opportunities</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">FitnessBrand</div>
                    <div className="text-xs text-gray-600">89% match</div>
                  </div>
                  <span className="text-xs font-medium text-blue-600">$200-400</span>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">WellnessApp</div>
                    <div className="text-xs text-gray-600">76% match</div>
                  </div>
                  <span className="text-xs font-medium text-green-600">$150-300</span>
                </div>
              </div>
              
              <button className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all">
                View All Opportunities
              </button>
            </div>

            {/* Subscription Status */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white">
              <h3 className="text-lg font-bold mb-2">Growth Starter Plan</h3>
              <p className="text-purple-100 text-sm mb-4">
                You're making great progress! Upgrade to Pro for advanced brand matching.
              </p>
              <button className="w-full px-4 py-2 bg-white text-purple-600 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}