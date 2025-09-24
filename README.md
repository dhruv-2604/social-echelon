# 🚀 Social Echelon

**The AI-powered wellness platform for content creators** - Automate engagement, detect trends, and prevent burnout while growing your audience authentically.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-green)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-purple)

## 🎯 Mission

Social Echelon is NOT just another social media tool. It's a wellness platform designed to help creators disconnect and rest while their AI assistant handles the repetitive tasks that lead to burnout.

**Core Philosophy:** Every feature must reduce cognitive load, run without intervention, and solve a burnout trigger.

## ✨ Features

### 🤖 AI Content Intelligence
- **Weekly Content Plans** - Personalized AI-generated content strategies
- **Smart Captions** - Engagement-optimized copy that sounds like you
- **Confidence Scoring** - Know which content will perform before posting

### 📈 Trend Detection System  
- **50,000 Posts Daily Analysis** - Comprehensive trend monitoring across 10 niches
- **Cross-Platform Intelligence** - Instagram + Twitter trend correlation
- **Audio Trend Detection** - Identify viral sounds early

### 🤝 Brand Partnership Matching
- **AI-Powered Matching** - 4D scoring algorithm (values, audience, content, success)
- **Smart Outreach Templates** - Personalized pitches that convert
- **Financial Recommendations** - Know your worth with market rate calculations

### 🔍 Algorithm Detection
- **Crowdsourced Intelligence** - Detect Instagram algorithm changes in real-time
- **Performance Anomaly Detection** - Know when it's the algorithm, not you
- **Predictive Insights** - Anticipate changes before they impact you

### 🧘 Wellness Features
- **Engagement Autopilot** (Coming Soon) - AI that responds like you while you rest
- **Burnout Prevention** - Automated systems that reduce daily overhead
- **Time Reclamation** - Get back 2-3 hours per day

## 🛠️ Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Framer Motion
- **Backend:** Next.js API Routes, PostgreSQL (Supabase)
- **AI/ML:** OpenAI GPT-4, Custom trend algorithms
- **Infrastructure:** Vercel, Supabase Auth, Apify scrapers
- **APIs:** Instagram Graph API, Twitter API (via Apify)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key
- Apify API token (for trend collection)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/social-echelon.git
cd social-echelon
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# Apify (for trend collection)
APIFY_TOKEN=your_apify_token

# Instagram
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret

# Resend (for emails)
RESEND_API_KEY=your_resend_key
```

5. Set up the database:
```bash
# Run migrations in Supabase SQL editor
# Files are in supabase/schemas/ and supabase/migrations/
```

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 📁 Project Structure

```
social-echelon/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── (authenticated)/    # Protected routes
│   │   ├── api/                # API endpoints
│   │   └── auth/               # Authentication pages
│   ├── components/             # React components
│   │   └── wellness/           # Wellness-focused UI components
│   └── lib/                    # Core business logic
│       ├── algorithm/          # Algorithm detection
│       ├── trends/             # Trend collection & analysis
│       ├── intelligence/       # AI content generation
│       └── supabase/          # Database utilities
├── public/                     # Static assets
├── supabase/                   # Database files
│   ├── migrations/            # Database migrations
│   ├── schemas/               # Schema definitions
│   └── fixes/                 # One-time fixes
└── CLAUDE.md                  # AI assistant instructions
```

## 🔧 Key Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
```

## 📊 Database Schema

The app uses PostgreSQL (via Supabase) with the following key tables:
- `profiles` - User profiles and preferences
- `trend_analysis` - Collected trend data
- `brands` - Brand partnership database
- `user_performance_summary` - Algorithm detection metrics
- `job_queue` - Background job processing

## 🕐 Cron Jobs

Configured in `vercel.json`:
- **Algorithm Detection:** Daily at 7 AM UTC
- **Trend Collection:** Daily at 9 AM UTC (collects 50k posts)

## 🔐 Security

- JWT authentication via Supabase Auth
- Row-level security (RLS) on all tables
- Input validation with Zod schemas
- Rate limiting on all API endpoints
- Secure environment variables

## 📈 Deployment

### Vercel Deployment

1. Push to GitHub
2. Connect repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

### Important Notes
- Currently on Vercel Hobby plan (2 cron jobs max)
- Function timeout: 10 seconds
- Consider Pro plan for production ($20/month)

## 🧪 Testing

```bash
# No test suite yet - coming soon
npm run typecheck  # Type checking only
```

## 📝 Important Files

- `CLAUDE.md` - Critical development guidelines
- `MISSION.md` - Product philosophy and vision
- `feature_status.md` - Current feature implementation status
- `ai-revolution-strategy.md` - AI enhancement roadmap
- `engagement-autopilot-spec.md` - Upcoming engagement automation

## 🤝 Contributing

1. Read `CLAUDE.md` for development guidelines
2. Check `feature_status.md` for what needs work
3. Follow the wellness philosophy - reduce cognitive load
4. Test thoroughly before submitting PRs

## 📄 License

Private and confidential - All rights reserved

## 🆘 Support

For issues or questions:
- Check `CLAUDE.md` for common solutions
- Open an issue on GitHub
- Contact: dhruvsureka308@gmail.com

## 🚧 Current Status

- ✅ Core features operational
- ✅ 50k posts/day trend collection
- ⚠️ Engagement Autopilot in development
- 🔄 Daily improvements and optimizations

---

**Remember:** This isn't just a tool, it's a wellness platform. Every line of code should help creators rest, not add to their burden.

Built with ❤️ for creators who need a break.