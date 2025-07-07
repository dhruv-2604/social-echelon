# Social Echelon - AI-Powered Talent Management Platform

Transform your Instagram presence with AI-driven insights, personalized growth strategies, and automated brand partnerships. Professional talent management for micro-influencers at a fraction of traditional costs.

## 🚀 Quick Start

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Environment Setup**
   Copy `.env.local` and fill in your API keys:
   ```bash
   cp .env.local .env.local.example
   ```

3. **Supabase Setup**
   - Create a new Supabase project
   - Run the SQL schema: `supabase-schema.sql`
   - Update your Supabase URL and keys in `.env.local`

4. **Facebook/Instagram Graph API Setup**
   - Create Facebook Developer account
   - Set up Facebook App with Instagram Graph API
   - Add Instagram Business Account permissions
   - Add your app ID, secret, and redirect URI

5. **Run Development Server**
   ```bash
   npm run dev
   ```

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **AI**: OpenAI GPT-4 API
- **Auth**: Instagram OAuth via Basic Display API
- **Payments**: Stripe
- **Deploy**: Vercel

### Core Features

#### Week 1 ✅ COMPLETED
- [x] Next.js project setup with TypeScript and Tailwind
- [x] Modern, responsive landing page with pricing tiers
- [x] Instagram OAuth authentication flow
- [x] Supabase database schema and integration
- [x] User dashboard with Instagram data visualization
- [x] Error handling and user feedback

#### Week 2 (In Progress)
- [ ] AI personalization engine with OpenAI integration
- [ ] Personalized AI content suggestions
- [ ] Growth analytics and insights
- [ ] Action center with daily tasks

#### Week 3 (Planned)
- [ ] Brand database and matching algorithm
- [ ] Automated brand partnership discovery
- [ ] Contract review assistance
- [ ] Advanced analytics and ROI tracking

#### Week 4 (Planned)
- [ ] Stripe subscription management
- [ ] Payment processing and billing
- [ ] Vercel deployment and production setup
- [ ] Performance optimization and launch prep

## 📊 Database Schema

### Core Tables
- `profiles` - User profiles with Instagram data
- `instagram_posts` - Cached Instagram post data
- `user_tokens` - Secure token storage
- `brands` - Partnership opportunities database
- `brand_matches` - AI-powered brand matching results
- `content_suggestions` - AI-generated content recommendations

## 🔑 Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Facebook/Instagram Graph API
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/auth/instagram/callback

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Stripe
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

## 🎯 Business Model

### Tier 1: Growth Starter ($97/month)
- AI content strategy & templates
- Growth analytics dashboard
- Community access
- Email support

### Tier 2: Pro Manager ($997/month)
- Everything in Growth Starter
- AI brand matching & outreach
- Contract review assistance
- Monthly 1:1 strategy calls
- Priority support

## 🚦 Getting Started Development

1. **Set up Facebook/Instagram Graph API**:
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create a new app (Business type)
   - Add Instagram Graph API product
   - Configure permissions: instagram_basic, pages_show_list, pages_read_engagement
   - Configure OAuth redirect URIs
   - **Important**: Requires Instagram Business Account connected to Facebook Page

2. **Set up Supabase**:
   - Create new project at [Supabase](https://supabase.com)
   - Run the `supabase-schema.sql` in SQL editor
   - Enable Row Level Security
   - Get your API keys

3. **Test the flow**:
   - Visit `http://localhost:3000`
   - Click "Connect Instagram & Start Free"
   - Authorize the app
   - View your dashboard

## 📁 Project Structure

```
src/
├── app/
│   ├── api/auth/instagram/     # Instagram OAuth endpoints
│   ├── auth/error/             # Authentication error page
│   ├── dashboard/              # User dashboard
│   └── page.tsx                # Landing page
├── lib/
│   ├── instagram.ts            # Instagram API client
│   ├── supabase.ts             # Supabase client & types
│   └── utils.ts                # Utility functions
└── components/                 # Reusable components (coming soon)
```

## 🔐 Security Features

- Row Level Security (RLS) on all tables
- Encrypted token storage (production)
- HTTPS-only cookies
- CSRF protection
- API rate limiting (planned)

## 📈 Next Steps

The foundation is complete! Ready to build the AI features and subscription management. The project is architected for rapid development and scalability.

---

**Social Echelon** - Democratizing talent management through AI