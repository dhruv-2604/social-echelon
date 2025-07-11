# CLAUDE.md - Critical Development Guidelines

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

### 5. **TESTING COMMANDS**
Before marking any feature as complete:
```bash
# Lint check
npm run lint

# Type check (if available)
npm run typecheck

# Build test
npm run build
```

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