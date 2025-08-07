export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="mb-4">
            By accessing and using Social Echelon, you agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use our service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
          <p className="mb-4">
            Social Echelon provides Instagram analytics, content planning, and brand matching services 
            for content creators. We analyze your Instagram data to provide insights and recommendations.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Instagram Integration</h2>
          <p className="mb-4">
            Our service requires you to connect your Instagram account. By doing so, you authorize us 
            to access your Instagram data in accordance with Instagram's Platform Policy. You must 
            comply with Instagram's Terms of Use while using our service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. User Responsibilities</h2>
          <p className="mb-4">You agree to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide accurate information</li>
            <li>Maintain the security of your account</li>
            <li>Not use the service for any illegal or unauthorized purpose</li>
            <li>Not violate Instagram's Terms of Use or Community Guidelines</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property</h2>
          <p className="mb-4">
            The service and its original content, features, and functionality are owned by 
            Social Echelon and are protected by international copyright, trademark, and other 
            intellectual property laws.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Limitation of Liability</h2>
          <p className="mb-4">
            Social Echelon shall not be liable for any indirect, incidental, special, consequential, 
            or punitive damages resulting from your use or inability to use the service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Termination</h2>
          <p className="mb-4">
            We may terminate or suspend your account at any time, without prior notice or liability, 
            for any reason, including breach of these Terms. You may also delete your account at any time.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Changes to Terms</h2>
          <p className="mb-4">
            We reserve the right to modify these terms at any time. We will notify users of any 
            material changes via email or through the service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Contact Information</h2>
          <p className="mb-4">
            For questions about these Terms of Service, please contact us at:
          </p>
          <p className="text-gray-600">legal@socialechelon.com</p>
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