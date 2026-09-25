# DropZone Cloud Storage Setup Guide

## Current Status

✅ **Code is ready for cloud storage**  
⚠️ **Supabase credentials need to be configured**

The application has been converted from local-only storage to cloud-based storage using Supabase. However, you need to configure your Supabase project credentials for it to work.

---

## What Changed

### Before (Local Storage)
- Files stored in browser IndexedDB
- Share links only worked on the same device/browser
- No persistence across devices
- Data lost when clearing browser data

### After (Cloud Storage)
- Files stored in Supabase Storage (cloud)
- Metadata stored in Supabase PostgreSQL
- Share links work from ANY device/browser
- Persistent storage that survives page refreshes
- Cross-device sharing enabled

---

## Required Setup Steps

### Step 1: Create Supabase Project (if not already done)

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in:
   - **Name**: `dropzone` (or your preferred name)
   - **Database Password**: (save this somewhere safe!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is sufficient
5. Wait for project to initialize (~2 minutes)

### Step 2: Get Your Credentials

1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefg.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

⚠️ **Important**: Only use the `anon` key. Never use the `service_role` key in frontend code.

### Step 3: Configure Environment Variables

Create a `.env` file in your project root:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_STORAGE_BUCKET=dropzone-files
```

Replace the values with your actual Supabase credentials.

### Step 4: Create Database Tables

Go to **SQL Editor** in Supabase Dashboard and run:

```sql
-- Create shares table
CREATE TABLE IF NOT EXISTS shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id TEXT NOT NULL REFERENCES shares(share_id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_files_share_id ON files(share_id);
CREATE INDEX IF NOT EXISTS idx_shares_share_id ON shares(share_id);

-- Enable Row Level Security
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Enable read access for all users" ON shares
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON shares
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON shares
  FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON files
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON files
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON files
  FOR DELETE USING (true);
```

### Step 5: Create Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Click "New bucket"
3. Fill in:
   - **Name**: `dropzone-files`
   - **Public bucket**: ✅ Enable (required for file access)
   - **File size limit**: `100 MB`
   - **Allowed MIME types**: Leave empty (allow all)
4. Click "Create bucket"

### Step 6: Configure Storage Policies

In the Storage section, click on your `dropzone-files` bucket, then go to **Policies** tab and create these policies:

**Policy 1: Public Read Access**
```sql
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'dropzone-files');
```

**Policy 2: Allow Public Uploads**
```sql
CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'dropzone-files');
```

**Policy 3: Allow Public Updates**
```sql
CREATE POLICY "Allow public updates"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'dropzone-files');
```

**Policy 4: Allow Public Deletes**
```sql
CREATE POLICY "Allow public deletes"
ON storage.objects
FOR DELETE
USING (bucket_id = 'dropzone-files');
```

Or run all policies at once:

```sql
-- Storage policies for dropzone-files bucket
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'dropzone-files');

CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'dropzone-files');

CREATE POLICY "Allow public updates" ON storage.objects
  FOR UPDATE USING (bucket_id = 'dropzone-files');

CREATE POLICY "Allow public deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'dropzone-files');
```

### Step 7: Restart Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

The server needs to restart to pick up the new environment variables.

---

## Deployment Configuration

### Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables for **Production**, **Preview**, and **Development**:
   ```
   VITE_SUPABASE_URL = https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY = your-anon-key-here
   VITE_SUPABASE_STORAGE_BUCKET = dropzone-files
   ```
4. **Redeploy** the application (required - env vars are injected at build time)

### Netlify

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the same variables as above
4. **Trigger a new deploy**

### Other Platforms

Most platforms follow the same pattern:
1. Find environment variables section
2. Add the `VITE_*` variables
3. Rebuild/redeploy

---

## Testing the Cloud Setup

After completing the setup, test the following:

### Test 1: Upload a File
1. Open the app in your browser
2. Upload a test file
3. Check Supabase Dashboard → Storage → `dropzone-files`
4. Verify the file appears in `shares/{shareId}/{fileId}/`

### Test 2: Verify Database
1. Go to Supabase Dashboard → Table Editor
2. Check `shares` table - should have your share_id
3. Check `files` table - should have file metadata

### Test 3: Share Link Works
1. Copy the share link
2. Open in a new browser tab
3. Verify the file loads

### Test 4: Cross-Device Sharing
1. Copy the share link
2. Open in incognito/private window
3. Verify the file is accessible
4. Test on a different device (phone, another computer)
5. Verify the file downloads correctly

### Test 5: Download All (ZIP)
1. Upload multiple files
2. Click "Download All"
3. Verify ZIP downloads
4. Extract and verify all files are present

---

## Architecture Overview

```
User uploads file
    ↓
Frontend (React)
    ↓
Supabase Client (anon key)
    ↓
┌───────────────────┬──────────────────┐
│  Supabase Storage │   PostgreSQL DB  │
│  (file binaries)  │   (metadata)     │
│                   │                  │
│  dropzone-files/  │  shares table    │
│  └── shares/      │  files table     │
│      └── {id}/    │                  │
│          └── file │                  │
└───────────────────┴──────────────────┘
    ↓
Share URL: /share/{shareId}
    ↓
Works from any device/browser
```

---

## Security Notes

✅ **Safe to expose in frontend:**
- `VITE_SUPABASE_URL` - Public project URL
- `VITE_SUPABASE_ANON_KEY` - Limited permissions via RLS

❌ **Never expose in frontend:**
- `service_role` key - Bypasses all security

The current implementation uses only the `anon` key with Row Level Security (RLS) policies, which is the correct approach for public file sharing.

---

## Troubleshooting

### "DropZone is not configured for cloud storage"

**Problem**: Environment variables not set

**Solution**:
1. Check `.env` file exists
2. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. Restart dev server

### "Failed to create share"

**Problem**: Database tables not created or RLS policies missing

**Solution**:
1. Run the SQL migrations in Supabase SQL Editor
2. Verify tables exist in Table Editor
3. Check RLS policies are enabled

### "Failed to upload file to storage"

**Problem**: Storage bucket not created or policies missing

**Solution**:
1. Verify `dropzone-files` bucket exists
2. Check bucket is set to **Public**
3. Verify storage policies allow INSERT

### "Share not found"

**Problem**: Share doesn't exist in database

**Solution**:
1. Check `shares` table for the share_id
2. Verify RLS policies allow SELECT
3. Try uploading again

---

## File Structure

```
src/
├── lib/
│   ├── supabase.ts          # Supabase client initialization
│   ├── storage.ts           # Cloud storage operations
│   └── zipUtils.ts          # ZIP download logic
├── pages/
│   ├── HomePage.tsx         # Upload page
│   └── SharePage.tsx        # Share view page
├── components/
│   └── ConfigurationError.tsx  # Config error UI
└── App.tsx                  # Main app with config check

.env                         # Your credentials (gitignored)
.env.example                 # Template file
```

---

## What You Need To Do

### Immediate Actions Required:

1. ✅ **Create/configure Supabase project** (if not done)
2. ✅ **Get credentials** from Supabase Dashboard
3. ✅ **Create `.env` file** with your credentials
4. ✅ **Run SQL migrations** to create tables
5. ✅ **Create storage bucket** `dropzone-files`
6. ✅ **Configure storage policies** for public access
7. ✅ **Restart dev server**
8. ✅ **Test upload and sharing**

### For Deployment:

1. ✅ **Add environment variables** to your deployment platform
2. ✅ **Redeploy** the application
3. ✅ **Test cross-device sharing**

---

## Summary

The DropZone application is now fully configured for cloud-based file sharing using Supabase. The code is complete and ready to use. You just need to:

1. Configure your Supabase credentials
2. Create the database tables
3. Create the storage bucket
4. Set up the policies

Once configured, the application will:
- ✅ Store files in cloud storage (Supabase Storage)
- ✅ Store metadata in cloud database (PostgreSQL)
- ✅ Generate persistent share links
- ✅ Work from any device/browser
- ✅ Support cross-device sharing
- ✅ Handle multiple file uploads
- ✅ Create ZIP downloads
- ✅ Provide proper error handling

**No local storage fallback** - everything is cloud-based for true cross-device sharing.
