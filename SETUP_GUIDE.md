# DropZone - Complete Setup Guide

## 🚀 Quick Start (5 minutes)

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Sign in
3. Click "New Project"
4. Fill in:
   - **Name**: `dropzone` (or your choice)
   - **Database Password**: (save this!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier is sufficient
5. Wait for project to initialize (~2 minutes)

### 2. Get Your Credentials

1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

⚠️ **Important**: Only use the `anon` key. Never use `service_role` key in frontend code.

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_STORAGE_BUCKET=dropzone-files
```

Replace the values with your actual Supabase credentials.

### 4. Create Database Tables

Go to **SQL Editor** in Supabase Dashboard and run:

```sql
-- Copy and paste the entire contents of:
-- supabase/migrations/001_initial_schema.sql
```

Or manually create the tables:

```sql
-- Create shares table
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create files table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id TEXT NOT NULL REFERENCES shares(share_id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_shares_share_id ON shares(share_id);
CREATE INDEX idx_files_share_id ON files(share_id);

-- Enable RLS
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Allow public access
CREATE POLICY "public_read_shares" ON shares FOR SELECT USING (true);
CREATE POLICY "public_insert_shares" ON shares FOR INSERT WITH CHECK (true);
CREATE POLICY "public_delete_shares" ON shares FOR DELETE USING (true);

CREATE POLICY "public_read_files" ON files FOR SELECT USING (true);
CREATE POLICY "public_insert_files" ON files FOR INSERT WITH CHECK (true);
CREATE POLICY "public_delete_files" ON files FOR DELETE USING (true);
```

### 5. Create Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Click "New bucket"
3. Fill in:
   - **Name**: `dropzone-files`
   - **Public bucket**: ✅ Enable (required for file access)
   - **File size limit**: `100 MB`
   - **Allowed MIME types**: Leave empty (allow all)
4. Click "Create bucket"

### 6. Configure Storage Policies

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

Or run all at once:

```sql
-- Copy and paste the entire contents of:
-- supabase/migrations/002_storage_setup.sql
```

### 7. Install Dependencies

```bash
npm install
```

### 8. Start Development Server

```bash
npm run dev
```

The app should open at `http://localhost:5173`

---

## ✅ Testing the Setup

### Test 1: Upload a Single File

1. Open the app in your browser
2. Drag and drop a file (or click to browse)
3. Wait for upload to complete
4. Copy the share link
5. Open the link in a **new incognito window**
6. ✅ File should be accessible

### Test 2: Upload Multiple Files

1. Upload 3-5 files at once
2. Copy the share link
3. Open in incognito
4. ✅ All files should be visible
5. Click "Download All"
6. ✅ ZIP should download with all files

### Test 3: Individual File Links

1. Upload a file
2. Click "Copy Link" on the file card
3. Open in incognito
4. ✅ Individual file page should load
5. Click "Download"
6. ✅ File should download

### Test 4: Cross-Device Testing

1. Upload files on Computer A
2. Copy the share link
3. Open on Computer B (or phone)
4. ✅ Files should be accessible

### Test 5: Verify Database

In Supabase dashboard → **Table Editor**:

1. Check `shares` table:
   - Should have a row with your `share_id`
   
2. Check `files` table:
   - Should have rows for each uploaded file
   - `storage_path` should match files in Storage

3. Check **Storage** → `dropzone-files`:
   - Navigate to `shares/{shareId}/{fileId}/`
   - ✅ Your files should be there

---

## 🔧 Troubleshooting

### "DropZone configuration error"

**Problem**: Environment variables not set

**Solution**:
- Check `.env` file exists
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart the dev server after changing `.env`

### "Failed to create share"

**Problem**: Database tables not created or RLS policies missing

**Solution**:
- Run the SQL migration in Supabase SQL Editor
- Verify tables exist in Table Editor
- Check RLS policies are enabled

### "Failed to upload file to storage"

**Problem**: Storage bucket doesn't exist or policies missing

**Solution**:
- Verify storage bucket `dropzone-files` exists
- Check storage policies allow INSERT
- Ensure bucket is set to **Public**

### "Share not found"

**Problem**: Share doesn't exist in database

**Solution**:
- Check share exists in `shares` table
- Verify the `share_id` in the URL matches the database
- Ensure RLS policies allow SELECT on `shares` table

### Files don't persist after refresh

**Problem**: This should not happen with Supabase backend

**Solution**:
- Check browser console for errors
- Verify you're not using the old IndexedDB implementation
- Check Supabase Dashboard for errors

---

## 📊 Database Schema

### shares table
```sql
id              UUID (primary key)
share_id        TEXT (unique, public identifier)
created_at      TIMESTAMP
```

### files table
```sql
id              UUID (primary key)
share_id        TEXT (foreign key → shares.share_id)
storage_path    TEXT (path in Supabase Storage)
original_name   TEXT (user's filename)
mime_type       TEXT (file type)
size            BIGINT (bytes)
created_at      TIMESTAMP
```

### Storage Structure
```
dropzone-files/
└── shares/
    └── {shareId}/
        └── {fileId}/
            └── {originalFilename}
```

---

## 🔒 Security

### What's Safe to Expose

✅ **anon key** - Designed for client-side use, limited permissions via RLS

### What's NOT Safe

❌ **service_role key** - Bypasses all security, never expose this

### Current Security Model

- **RLS enabled** on all tables
- **Public read/write** (no authentication required for MVP)
- **Storage policies** restrict to `dropzone-files` bucket only
- **No service_role key** in frontend code

### Future Enhancements

For production use, consider:
- Adding authentication (Supabase Auth)
- Rate limiting uploads
- File size limits per user
- Expiring share links
- Private shares with passwords

---

## 🌐 Deployment

### Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add for Production, Preview, Development:
   ```
   VITE_SUPABASE_URL = https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY = your-anon-key
   VITE_SUPABASE_STORAGE_BUCKET = dropzone-files
   ```
3. **Redeploy** (required - env vars are injected at build time)

### Netlify

1. Go to Netlify Dashboard → Your Site → Site settings → Environment variables
2. Add the same variables
3. **Trigger new deploy**

### Other Platforms

Most platforms follow the same pattern:
1. Find environment variables section
2. Add the `VITE_*` variables
3. Rebuild/redeploy

**Critical**: Environment variables are injected at build time. You MUST redeploy after adding them.

---

## 💰 Cost Estimation (Supabase Free Tier)

**Free Tier Includes:**
- 500 MB database
- 1 GB file storage
- 2 GB bandwidth/month
- 50,000 monthly active users

**For DropZone:**
- Database: ~1 KB per file metadata → 500,000 files
- Storage: Depends on user uploads → 1 GB limit
- Bandwidth: Depends on downloads → 2 GB limit

**When to Upgrade:**
- If you exceed 1 GB storage
- If you exceed 2 GB bandwidth
- If you need more database space

---

## 📝 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public anon key | `eyJhbGc...` |
| `VITE_SUPABASE_STORAGE_BUCKET` | Storage bucket name | `dropzone-files` |

---

## 🎯 Architecture

```
User uploads file
    ↓
Frontend (React + Vite)
    ↓
Supabase Client (anon key)
    ↓
┌───────────────────┬──────────────────┐
│  Supabase Storage │   PostgreSQL DB  │
│  (file binaries)  │   (metadata)     │
└───────────────────┴──────────────────┘
    ↓
Share URLs work from any device/browser
```

---

## 📚 Support

- **Supabase Docs**: https://supabase.com/docs
- **Storage Guide**: https://supabase.com/docs/guides/storage
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security

---

## ✅ Checklist

Before going live, verify:

- [ ] Supabase project created
- [ ] `.env` file configured with credentials
- [ ] Database tables created (shares, files)
- [ ] RLS policies enabled and configured
- [ ] Storage bucket `dropzone-files` created
- [ ] Storage bucket set to Public
- [ ] Storage policies configured
- [ ] Dev server restarted
- [ ] Upload test successful
- [ ] Share link works in incognito
- [ ] Cross-device sharing works
- [ ] Download All (ZIP) works
- [ ] Environment variables set in deployment platform
- [ ] Production deployment successful

---

**Status**: Ready for setup  
**Time to configure**: ~10 minutes  
**Difficulty**: Easy (copy-paste SQL, fill in env vars)
