# DropZone Supabase Backend Setup Guide

## Overview

DropZone now uses Supabase as its persistent backend for file storage and metadata management. This guide walks you through the complete setup process.

## Architecture

```
User uploads files
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

## Prerequisites

1. A Supabase account (free tier works)
2. Node.js 18+ installed
3. npm or yarn package manager

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in:
   - **Name**: `dropzone` (or your preferred name)
   - **Database Password**: (save this somewhere safe)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free (sufficient for testing)
5. Click "Create new project"
6. Wait for project to initialize (~2 minutes)

## Step 2: Get Your Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

⚠️ **Security Note**: Only use the `anon` key in your frontend. Never expose the `service_role` key.

## Step 3: Configure Environment Variables

1. In your project root, create a `.env` file:

```bash
cp .env.example .env
```

2. Edit `.env` and fill in your values:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_STORAGE_BUCKET=dropzone-files
```

⚠️ **Important**: The `.env` file is already in `.gitignore` and will not be committed.

## Step 4: Create Database Tables

### Option A: Using SQL Editor (Recommended)

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Click "Run" or press `Ctrl+Enter`
5. You should see "Success. No rows returned"

### Option B: Using Supabase CLI (Alternative)

If you have the Supabase CLI installed:

```bash
# Link your project
supabase link --project-ref your-project-id

# Apply migrations
supabase db push
```

## Step 5: Create Storage Bucket

1. In Supabase dashboard, go to **Storage**
2. Click "New bucket"
3. Fill in:
   - **Name**: `dropzone-files`
   - **Public bucket**: ✅ **Enable** (files need to be publicly accessible)
   - **File size limit**: `100 MB`
   - **Allowed MIME types**: Leave empty (allow all)
4. Click "Create bucket"

## Step 6: Configure Storage Policies

1. Still in **Storage**, click on your `dropzone-files` bucket
2. Go to the **Policies** tab
3. Click "New Policy" → "For full customization"
4. Create these 4 policies:

### Policy 1: Public Read Access
- **Policy name**: `Public read access`
- **Allowed operation**: `SELECT`
- **Target roles**: Leave as `public`
- **USING expression**: `bucket_id = 'dropzone-files'`

### Policy 2: Allow Public Uploads
- **Policy name**: `Allow public uploads`
- **Allowed operation**: `INSERT`
- **Target roles**: Leave as `public`
- **WITH CHECK expression**: `bucket_id = 'dropzone-files'`

### Policy 3: Allow Public Updates
- **Policy name**: `Allow public updates`
- **Allowed operation**: `UPDATE`
- **Target roles**: Leave as `public`
- **USING expression**: `bucket_id = 'dropzone-files'`

### Policy 4: Allow Public Deletes
- **Policy name**: `Allow public deletes`
- **Allowed operation**: `DELETE`
- **Target roles**: Leave as `public`
- **USING expression**: `bucket_id = 'dropzone-files'`

**OR** use the SQL from `supabase/migrations/002_storage_setup.sql` in the SQL Editor.

## Step 7: Install Dependencies

```bash
npm install
```

## Step 8: Run the Application

```bash
npm run dev
```

The app should open at `http://localhost:5173`

## Testing the Setup

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

## Troubleshooting

### "Missing Supabase environment variables"

- Check that `.env` file exists in project root
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart the dev server after changing `.env`

### "Failed to create share"

- Check that database tables were created (Step 4)
- Verify RLS policies are enabled
- Check browser console for detailed errors

### "Failed to upload file to storage"

- Verify storage bucket `dropzone-files` exists (Step 5)
- Check storage policies allow INSERT (Step 6)
- Ensure bucket is set to **Public**

### "Share not found" when opening link

- Verify the share exists in the `shares` table
- Check that the `share_id` in the URL matches the database
- Ensure RLS policies allow SELECT on `shares` table

### Files don't persist after refresh

- This should not happen with Supabase backend
- Check browser console for errors
- Verify you're not using the old IndexedDB implementation

## Security Considerations

### What's Safe to Expose

✅ **anon key** - Designed for client-side use, limited permissions via RLS

### What's NOT Safe

❌ **service_role key** - Bypasses all security, never expose this

### Current Security Model

- **RLS enabled** on all tables
- **Public read/write** (no authentication required)
- **Storage policies** restrict to `dropzone-files` bucket only
- **No service_role key** in frontend code

### Future Enhancements

For production use, consider:
- Adding authentication (Supabase Auth)
- Rate limiting uploads
- File size limits per user
- Expiring share links
- Private shares with passwords

## Database Schema

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

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public anon key | `eyJhbGc...` |
| `VITE_SUPABASE_STORAGE_BUCKET` | Storage bucket name | `dropzone-files` |

## File Structure

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql    # Database tables
│   └── 002_storage_setup.sql     # Storage policies

src/
├── lib/
│   ├── supabase.ts              # Supabase client
│   ├── storage.ts               # Storage operations
│   └── zipUtils.ts              # ZIP download logic
├── hooks/
│   └── useUpload.ts             # Upload hook
└── pages/
    └── SharePage.tsx            # Share page (updated)

.env.example                     # Environment template
.env                             # Your credentials (gitignored)
```

## Cleanup

To delete a share and all its files:

```typescript
import { deleteShare } from './lib/storage';
await deleteShare(shareId);
```

This will:
1. Delete all files from Storage
2. Delete all file records from database
3. Delete the share record

## Support

- Supabase Docs: https://supabase.com/docs
- Storage Docs: https://supabase.com/docs/guides/storage
- RLS Docs: https://supabase.com/docs/guides/auth/row-level-security

## Next Steps

After confirming everything works:

1. ✅ Test cross-device sharing
2. ✅ Verify file persistence
3. ✅ Test ZIP downloads
4. ⚠️ Consider adding authentication for production
5. ⚠️ Set up monitoring/alerts
6. ⚠️ Configure custom domain (optional)
7. ⚠️ Set up backups (Supabase does this automatically)

---

**Status**: ✅ Backend integration complete
**Last Updated**: 2024
**Version**: 1.0.0
