# 🚀 Social Echelon

**First wellness platform for content creators - made possible with AI/ML** - Automate engagement, detect trends, and prevent burnout while growing your audience authentically.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-green)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-purple)

## 🎯 Mission

Social Echelon is NOT just another social media tool. It's a wellness platform designed to help creators disconnect and rest while their AI assistant handles the repetitive tasks that lead to burnout.

**Core Philosophy:** Every feature must reduce cognitive load, run without intervention, and solve a burnout trigger.

## Features

### AI Content Intelligence
- **Weekly Content Plans** - Personalized AI-generated content strategies
- **Smart Captions** - Engagement-optimized copy that sounds like you
- **Confidence Scoring** - Know which content will perform before posting

### Trend Detection System  
- **50,000 Posts Daily Analysis** - Comprehensive trend monitoring across 10 niches
- **Cross-Platform Intelligence** - Instagram + Twitter trend correlation
- **Audio Trend Detection** - Identify viral sounds early

### Brand Partnership Matching
- **AI-Powered Matching** - 4D scoring algorithm (values, audience, content, success)
- **Smart Outreach Templates** - Personalized pitches that convert
- **Financial Recommendations** - Know your worth with market rate calculations

### Algorithm Detection
- **Crowdsourced Intelligence** - Detect Instagram algorithm changes in real-time
- **Performance Anomaly Detection** - Know when it's the algorithm, not you
- **Predictive Insights** - Anticipate changes before they impact you

### Wellness Features
- **Engagement Autopilot** (Coming Soon) - AI that responds like you while you rest
- **Burnout Prevention** - Automated systems that reduce daily overhead
- **Time Reclamation** - Get back 2-3 hours per day

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Framer Motion
- **Backend:** Next.js API Routes, PostgreSQL (Supabase)
- **AI/ML:** OpenAI GPT-4, Custom trend algorithms
- **Infrastructure:** Vercel, Supabase Auth, Apify scrapers
- **APIs:** Instagram Graph API, Twitter API (via Apify)


## Project Structure

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

## Database Schema

The app uses PostgreSQL (via Supabase) with the following key tables:
- `profiles` - User profiles and preferences
- `trend_analysis` - Collected trend data
- `brands` - Brand partnership database
- `user_performance_summary` - Algorithm detection metrics
- `job_queue` - Background job processing

## Cron Jobs

Configured in `vercel.json`:
- **Algorithm Detection:** Daily at 7 AM UTC
- **Trend Collection:** Daily at 9 AM UTC (collects 50k posts)


## Support

For issues or questions:
- Open an issue on GitHub
- Contact: dhruv@socialechelon.com

---

**Remember:** This isn't just a tool, it's a wellness platform. Every line of code should help creators rest, not add to their burden.

Built with ❤️ for creators who need a break.
