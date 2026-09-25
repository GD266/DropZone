# DropZone Deployment Configuration Guide

## Issue: Black Screen After Deployment

### Root Cause

The application was showing a black screen because:

1. **Missing Environment Variables**: The deployed application did not have `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configured
2. **Hard Crash on Missing Config**: The original `src/lib/supabase.ts` threw an error at module load time when env vars were missing, preventing React from rendering anything
3. **No Error UI**: There was no fallback UI to show when configuration was missing

### Solution Implemented

✅ **Fixed Supabase initialization** to check configuration gracefully
✅ **Added ConfigurationError component** that displays helpful error message
✅ **Updated App.tsx** to show error UI when Supabase is not configured
✅ **Improved error messages** to guide users on what to configure

---

## Required Environment Variables

### For Client-Side (Browser)

These variables are **safe to expose** in the browser and are injected at build time by Vite:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to find these:**
1. Go to your Supabase Dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy **Project URL** → `VITE_SUPABASE_URL`
5. Copy **anon public key** → `VITE_SUPABASE_ANON_KEY`

### For Server-Side (Optional - Not Currently Used)

This variable is **NOT safe to expose** and should never be in frontend code:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Current Status**: Not used in this implementation. All operations use the anon key with RLS policies.

---

## Deployment Platform Configuration

### Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables for **Production**, **Preview**, and **Development**:

```
VITE_SUPABASE_URL = https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. **Redeploy** the application (environment variables are injected at build time)

**Important**: After adding environment variables, you must trigger a new deployment. Vite injects `VITE_*` variables during the build process.

### Netlify

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add these variables:

```
VITE_SUPABASE_URL = https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. **Trigger a new deploy** from the Deploys tab

### Other Platforms (Railway, Render, Fly.io, etc.)

Most platforms follow the same pattern:
1. Find the environment variables section in your dashboard
2. Add the `VITE_*` variables
3. Trigger a rebuild/redeploy

---

## Local Development Setup

### 1. Create .env file

```bash
cp .env.example .env
```

### 2. Edit .env

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_STORAGE_BUCKET=dropzone-files
```

### 3. Restart dev server

```bash
npm run dev
```

**Important**: You must restart the dev server after changing `.env` files. Vite reads environment variables at startup.

---

## Verification Steps

### Step 1: Check Build Output

After deploying, the build should complete without errors:

```bash
npm run build
```

Expected output:
```
✓ built in X.XXs
```

### Step 2: Open Deployed URL

1. Open your deployed application URL
2. **Expected**: DropZone UI loads with upload interface
3. **If still black screen**: Check browser console for errors

### Step 3: Check Browser Console

Open DevTools (F12) → Console tab

**Expected**: No errors about missing environment variables

**If you see**:
```
Missing Supabase environment variables...
```
→ Environment variables are not configured in deployment

**If you see**:
```
Supabase is not configured...
```
→ The ConfigurationError component is showing (this is expected if vars are missing)

### Step 4: Test Upload

1. Upload a test file
2. Check browser console for network requests
3. Verify file appears in Supabase Storage

### Step 5: Test Share Link

1. Copy the share link
2. Open in incognito window
3. Verify file is accessible

---

## Troubleshooting

### Black Screen Persists

**Check 1: Environment Variables in Deployment Platform**
- Verify variables are set in your deployment platform's dashboard
- Ensure variable names are exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check for typos or extra spaces

**Check 2: Redeploy After Adding Variables**
- Environment variables are injected at build time
- You must trigger a new deployment after adding variables
- In Vercel: Go to Deployments → Redeploy
- In Netlify: Go to Deploys → Trigger deploy

**Check 3: Browser Cache**
- Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Clear browser cache
- Try incognito/private browsing mode

**Check 4: Check Built Files**
Download the built `dist/index.html` and search for your Supabase URL:
```bash
grep -r "supabase.co" dist/
```
If not found, variables were not injected during build.

### Configuration Error UI Shows

If you see the "DropZone configuration error" message:

1. This means the app is working correctly
2. Environment variables are genuinely missing
3. Follow the instructions in the error message
4. Add the variables to your deployment platform
5. Redeploy

### Upload Fails

**Error**: "Failed to create share"
- Check database tables exist (run migrations)
- Verify RLS policies are configured
- Check Supabase Dashboard → Logs for errors

**Error**: "Failed to upload file to storage"
- Verify storage bucket `dropzone-files` exists
- Check storage policies allow INSERT
- Ensure bucket is set to Public

**Error**: "Failed to save file metadata"
- Check `files` table exists
- Verify RLS policies allow INSERT on files table

### Share Link Shows "Share not found"

- Verify the share exists in the `shares` table
- Check that the share_id in the URL matches the database
- Verify RLS policies allow SELECT on shares table

---

## Security Checklist

✅ **Safe to expose in browser:**
- `VITE_SUPABASE_URL` - Public project URL
- `VITE_SUPABASE_ANON_KEY` - Limited permissions via RLS

❌ **Never expose in browser:**
- `SUPABASE_SERVICE_ROLE_KEY` - Bypasses all security

**Current Implementation:**
- ✅ Only uses anon key in frontend
- ✅ Service role key not present in codebase
- ✅ RLS policies restrict access appropriately
- ✅ No hardcoded credentials

---

## Files Changed

### Modified Files

1. **src/lib/supabase.ts**
   - Changed from throwing error at module load
   - Added `isSupabaseConfigured()` function
   - Added `getConfigurationError()` function
   - Added `getSupabaseClient()` function
   - Made client initialization lazy

2. **src/App.tsx**
   - Added configuration check before rendering
   - Shows ConfigurationError component if not configured

3. **src/lib/storage.ts**
   - Updated to use `getSupabaseClient()` instead of direct import
   - All Supabase operations now go through the safe client getter

### New Files

1. **src/components/ConfigurationError.tsx**
   - User-friendly error UI when Supabase is not configured
   - Shows which variables are missing
   - Provides setup instructions

2. **DEPLOYMENT_CONFIG.md** (this file)
   - Complete deployment configuration guide
   - Troubleshooting steps
   - Verification checklist

---

## Build Verification

### Local Build Test

```bash
# Clean build
rm -rf dist
npm run build

# Check output
ls -la dist/
```

Expected files:
```
dist/
├── index.html
└── assets/
    ├── index-XXXXX.css
    └── index-XXXXX.js
```

### Check Environment Variables in Build

```bash
# Search for Supabase URL in built files
grep -r "supabase.co" dist/

# Should find your project URL if VITE_SUPABASE_URL was set during build
```

### Preview Production Build Locally

```bash
# Build
npm run build

# Preview
npm run preview
```

Open http://localhost:4173 and verify:
- ✅ UI loads (no black screen)
- ✅ No console errors about missing env vars
- ✅ Upload interface is visible

---

## Deployment Checklist

Before deploying, verify:

- [ ] `.env` file exists locally with correct values
- [ ] `npm run build` completes successfully
- [ ] `npm run preview` shows working UI locally
- [ ] Environment variables are set in deployment platform
- [ ] Deployment platform is configured to rebuild after env var changes
- [ ] New deployment has been triggered
- [ ] Deployed URL loads without black screen
- [ ] Browser console has no configuration errors
- [ ] Upload functionality works
- [ ] Share links work in incognito
- [ ] Share links work on different devices

---

## Quick Fix Summary

If you're seeing a black screen:

1. **Add environment variables to your deployment platform:**
   ```
   VITE_SUPABASE_URL = https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY = your-anon-key
   ```

2. **Redeploy the application** (required - env vars are injected at build time)

3. **Hard refresh the browser** (Ctrl+Shift+R or Cmd+Shift+R)

4. **Verify** the UI loads and no console errors appear

---

## Support

If issues persist after following this guide:

1. Check browser console for exact error messages
2. Verify environment variables in deployment platform
3. Check Supabase Dashboard for project status
4. Review deployment logs for build errors
5. Compare local `.env` with deployment platform variables

**Common mistake**: Forgetting to redeploy after adding environment variables. Vite injects `VITE_*` variables at build time, so a new build is required.
