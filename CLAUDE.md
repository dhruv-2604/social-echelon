# CLAUDE.md - Critical Development Guidelines

## 🎯 MISSION CRITICAL - READ FIRST
**Social Echelon is a WELLNESS platform, not just a tool.**
See MISSION.md for core philosophy. Every feature MUST:
- Reduce cognitive load (not add to it)
- Run without user intervention  
- Help creators disconnect and rest
- Solve a burnout trigger

## 🚨 IMPORTANT RULES FOR MAINTAINING THIS CODEBASE

### 1. **NO REDUNDANT FILES - EVER**
When revising or refactoring a feature:
- ❌ DON'T create `feature-v2.ts` or `feature-revised.sql` 
- ✅ DO update the original file or DELETE the old one
- ✅ DO check for all references before making changes

### 2. **THINK CRITICALLY - DON'T BLINDLY AGREE**
When the user makes suggestions:
- Question if it makes technical sense
- Point out potential issues or conflicts
- Suggest better alternatives if the approach has problems
- Explain tradeoffs clearly

### 3. **CLEAN UP AFTER YOURSELF**
After implementing any feature:
- Remove all old/unused files
- Update all imports and references
- Check for naming conflicts
- Run a search for old function/class names

### 4. **CURRENT TECH STACK**
- Next.js 14 (NOT 15) with React 18 (NOT 19)
- Supabase for database and auth
- Instagram Graph API (limited to what's actually available)
- OpenAI for content generation
- TypeScript for type safety

### 5. **TESTING COMMANDS - MANDATORY**
Before marking ANY feature as complete:
```bash
# 1. ALWAYS run build test FIRST (catches 90% of issues)
npm run build

# If build fails, FIX IMMEDIATELY before proceeding

# 2. Then run lint check
npm run lint

# 3. Type check (if available)
npm run typecheck
```

**⚠️ CRITICAL: Never commit code without running `npm run build` successfully!**

### 6. **INSTAGRAM API LIMITATIONS**
What we CAN get:
- reach, impressions, likes, comments, saves
- Basic media insights

What we CANNOT get:
- Hashtag performance analytics
- Explore page breakdown
- Detailed discovery sources

### 7. **FILE NAMING CONVENTIONS**
- Components: PascalCase (e.g., `WeeklyContentPlan.tsx`)
- Utilities: camelCase (e.g., `contentGenerator.ts`)
- API routes: kebab-case folders (e.g., `/api/user/profile`)
- SQL files: kebab-case with clear purpose (e.g., `user-schema.sql`)

### 8. **DATABASE CHANGES**
When modifying database:
1. UPDATE existing schema files, don't create new versions
2. Consider migration impacts on existing data
3. Test RLS policies
4. Document any breaking changes

### 9. **DEPLOYMENT CHECKLIST**
Before deployment:
- [ ] No duplicate/redundant files
- [ ] All old code removed
- [ ] Environment variables documented
- [ ] API endpoints tested
- [ ] Database migrations ready

### 10. **CURRENT KNOWN ISSUES**
- Instagram hashtag API doesn't provide the metrics we need
- Need to deploy to Vercel for cron jobs to work
- Algorithm detection needs 30+ users to be meaningful
- Vercel Hobby plan: Max 2 cron jobs, once per day only

### 11. **PREVENTING BUILD FAILURES**

#### Common TypeScript Issues & Solutions:
```typescript
// ❌ BAD: Assuming Supabase returns typed data
const { data } = await supabase.from('table').select()
return data.someField  // Type error!

// ✅ GOOD: Handle unknown types from Supabase
const { data } = await supabase.from('table').select()
return (data as any).someField  // Or use proper type assertion
```

#### Import Path Issues:
```typescript
// ❌ BAD: Wrong import paths
import { AlgorithmDetector } from '@/lib/algorithm/detector'  // File doesn't exist!

// ✅ GOOD: Verify file exists first
import { AnomalyDetector } from '@/lib/algorithm/anomaly-detector'  // Correct file name
```

#### Method Type Issues:
```typescript
// ❌ BAD: Using instance method as static
const generator = new ContentGenerator()
await generator.generateWeeklyPlan()  // Error if it's static!

// ✅ GOOD: Check if method is static or instance
await ContentGenerator.generateWeeklyPlan()  // For static methods
```

#### ALWAYS Before Writing Code:
1. Check if imported files exist: `ls src/lib/...`
2. Verify method signatures: grep for the function name
3. Test imports in isolation before using
4. Run `npm run build` after EVERY file change
5. Fix TypeScript errors immediately, don't accumulate them

### 12. **VERCEL DEPLOYMENT CONSTRAINTS**
- **Hobby Plan Limits:**
  - 2 cron jobs maximum
  - Crons run once per day max
  - 10-second function timeout
  - No background jobs
  
- **Pro Plan ($20/month) Benefits:**
  - Unlimited cron jobs
  - Crons can run every minute
  - 60-second function timeout
  - Better for production

### 13. **BEFORE EVERY COMMIT CHECKLIST**
```bash
# 1. Build must pass
npm run build  # MUST succeed

# 2. Check for unused imports
# 3. Verify all file paths are correct
# 4. Ensure JSON files have no comments
# 5. Exclude test/script files from tsconfig.json if needed
```