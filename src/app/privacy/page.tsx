export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
          <p className="mb-4">When you use Social Echelon, we collect:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Instagram account information (username, profile picture, follower count)</li>
            <li>Instagram content data (posts, likes, comments, engagement metrics)</li>
            <li>Usage data (features you use, actions you take)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
          <p className="mb-4">We use your information to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide analytics and insights about your Instagram performance</li>
            <li>Generate content recommendations and strategies</li>
            <li>Track engagement metrics and growth patterns</li>
            <li>Match you with relevant brand partnership opportunities</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Data Storage and Security</h2>
          <p className="mb-4">
            Your data is stored securely using industry-standard encryption. We use Supabase 
            for database management and implement row-level security to protect your information. 
            Only you can access your account data.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Instagram Data Usage</h2>
          <p className="mb-4">
            We access your Instagram data through Instagram's official APIs in compliance with 
            their Platform Policy. We only request permissions necessary for the app's functionality 
            and never store your Instagram password.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Data Sharing</h2>
          <p className="mb-4">
            We do not sell, rent, or share your personal information with third parties. Your 
            Instagram data is used solely for providing services within Social Echelon.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
          <p className="mb-4">You have the right to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Access your personal data</li>
            <li>Delete your account and all associated data</li>
            <li>Revoke Instagram access at any time</li>
            <li>Export your data</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
          <p className="mb-4">
            We retain your data as long as your account is active. If you delete your account, 
            we will remove your personal information within 30 days, except where retention is 
            required by law.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
          <p className="mb-4">
            If you have questions about this Privacy Policy or your data, please contact us at:
          </p>
          <p className="text-gray-600">privacy@socialechelon.com</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
          <p className="mb-4">
            We may update this Privacy Policy from time to time. We will notify you of any 
            changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <a href="/" className="text-purple-600 hover:text-purple-700">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}