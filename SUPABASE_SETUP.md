# Supabase Setup Guide (Optional)

This guide explains how to configure Supabase for **cross-device file sharing** and **persistent cloud storage**.

**Note**: DropZone works out of the box without Supabase using local browser storage. This setup is only needed if you want files to be accessible from different devices.

## When Do You Need Supabase?

### You DON'T need Supabase if:
- ✅ You only share files on the same device/browser
- ✅ You want files to stay private on your device
- ✅ You're just testing the app
- ✅ You want instant setup with zero configuration

### You DO need Supabase if:
- ✅ You want share links to work on different devices
- ✅ You want files to persist after clearing browser data
- ✅ You're deploying to production for others to use
- ✅ You need cross-device file sharing

## Setup Steps

### 1. Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project
4. Wait for the project to initialize (~2 minutes)

### 2. Get Your Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

⚠️ **Important**: Only use the `anon` key. Never use the `service_role` key in frontend code.

### 3. Create Environment File

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_STORAGE_BUCKET=dropzone-files
```

Replace the values with your actual Supabase credentials.

### 4. Create Database Tables

Go to **SQL Editor** in your Supabase dashboard and run:

```sql
-- Create shares table
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create files table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id TEXT NOT NULL REFERENCES shares(share_id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_shares_share_id ON shares(share_id);
CREATE INDEX idx_files_share_id ON files(share_id);

-- Enable Row Level Security
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Enable read access for all users" ON shares
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON files
  FOR SELECT USING (true);

-- Allow public insert (for uploads)
CREATE POLICY "Enable insert access for all users" ON shares
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable insert access for all users" ON files
  FOR INSERT WITH CHECK (true);

-- Allow public delete (for cleanup)
CREATE POLICY "Enable delete access for all users" ON shares
  FOR DELETE USING (true);

CREATE POLICY "Enable delete access for all users" ON files
  FOR DELETE USING (true);
```

### 5. Create Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Fill in:
   - **Name**: `dropzone-files`
   - **Public bucket**: ✅ Enable (required for file access)
   - **File size limit**: `100 MB` (or your preferred limit)
   - **Allowed MIME types**: Leave empty (allow all)
4. Click **Create bucket**

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

### 7. Restart Development Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

The server needs to restart to pick up the new environment variables.

## Testing the Setup

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

## Troubleshooting

### "Failed to create share"
- Check that database tables were created
- Verify RLS policies are enabled
- Check Supabase Dashboard → Logs for errors

### "Failed to upload file to storage"
- Verify storage bucket `dropzone-files` exists
- Check storage policies allow INSERT
- Ensure bucket is set to **Public**

### "Share not found"
- Check share exists in `shares` table
- Verify RLS policies allow SELECT
- Try uploading again

### Files don't persist after refresh
- This should not happen with Supabase backend
- Check browser console for errors
- Verify you're not using the old IndexedDB implementation

## Security Notes

✅ **Safe to expose in frontend:**
- `VITE_SUPABASE_URL` - Public project URL
- `VITE_SUPABASE_ANON_KEY` - Limited permissions via RLS

❌ **Never expose in frontend:**
- `service_role` key - Bypasses all security

The current implementation uses only the `anon` key with Row Level Security (RLS) policies, which is the correct approach for public file sharing.

## Cost Estimation (Supabase Free Tier)

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

## Architecture

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

## Storage Path Structure

Files are stored with the following path structure:

```
shares/{shareId}/{fileId}/{originalFilename}
```

Example:
```
shares/abc123-def456/file789-uvw/photo.png
```

This structure:
1. Groups files by share for easy management
2. Uses fileId to prevent filename collisions
3. Preserves original filename for downloads

## Next Steps

After confirming everything works:

1. ✅ Test cross-device sharing
2. ✅ Verify file persistence
3. ✅ Test ZIP downloads
4. ⚠️ Consider adding authentication for production
5. ⚠️ Set up monitoring/alerts
6. ⚠️ Configure custom domain (optional)
7. ⚠️ Set up backups (Supabase does this automatically)

## Support

- Supabase Docs: https://supabase.com/docs
- Storage Docs: https://supabase.com/docs/guides/storage
- RLS Docs: https://supabase.com/docs/guides/auth/row-level-security

---

**Remember**: Supabase is optional! DropZone works perfectly with local browser storage for single-device use cases.
