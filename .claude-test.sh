#!/bin/bash

# Claude Pre-Deployment Test Script
# Run this before EVERY deployment to catch issues early

echo "🔍 Running Claude Pre-Deployment Checks..."
echo "=========================================="

# 1. Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

# 2. Run build test
echo "📦 Testing build..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Build successful"
else
    echo "❌ Build failed! Fix errors before proceeding."
    echo "Run 'npm run build' to see detailed errors"
    exit 1
fi

# 3. Check for TypeScript errors
echo "🔧 Checking TypeScript..."
if npx tsc --noEmit > /dev/null 2>&1; then
    echo "✅ No TypeScript errors"
else
    echo "⚠️  TypeScript errors detected"
    echo "Run 'npx tsc --noEmit' to see errors"
fi

# 4. Check for JSON syntax in vercel.json
echo "📋 Validating vercel.json..."
if node -e "JSON.parse(require('fs').readFileSync('vercel.json'))" 2>/dev/null; then
    echo "✅ vercel.json is valid"
else
    echo "❌ vercel.json has syntax errors (probably comments)"
    exit 1
fi

# 5. Check Vercel cron job count (Hobby plan limit)
CRON_COUNT=$(grep -o '"path"' vercel.json | wc -l)
if [ $CRON_COUNT -le 2 ]; then
    echo "✅ Cron jobs within Hobby plan limit ($CRON_COUNT/2)"
else
    echo "⚠️  Warning: Too many cron jobs for Hobby plan ($CRON_COUNT/2)"
fi

# 6. Check for common import issues
echo "🔎 Checking for suspicious imports..."
SUSPICIOUS=$(grep -r "from '@/lib/.*'" --include="*.ts" --include="*.tsx" src/ 2>/dev/null | grep -E "(detector|content-generator)" | wc -l)
if [ $SUSPICIOUS -gt 0 ]; then
    echo "⚠️  Found potentially incorrect import paths. Verify they exist."
fi

echo ""
echo "=========================================="
echo "✨ Pre-deployment checks complete!"
echo ""
echo "If all checks passed, you can deploy with:"
echo "  git add ."
echo "  git commit -m 'your message'"
echo "  git push"
echo ""