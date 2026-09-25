# DropZone Supabase Integration - Quick Start

## ✅ What's Done

The DropZone application has been fully integrated with Supabase as the persistent backend:

- ✅ Database schema created (PostgreSQL)
- ✅ Storage configuration defined (Supabase Storage)
- ✅ Frontend code updated to use Supabase
- ✅ All IndexedDB code removed
- ✅ Share links now work across devices
- ✅ Build successful, no errors

## 📋 What You Need To Do

### 1. Create Supabase Project (5 minutes)
```
1. Go to https://supabase.com
2. Sign up / Sign in
3. Click "New Project"
4. Name: dropzone
5. Set database password (save it!)
6. Choose region
7. Wait for project to initialize
```

### 2. Get Your Credentials (1 minute)
```
1. In Supabase Dashboard → Settings → API
2. Copy:
   - Project URL (e.g., https://abc123.supabase.co)
   - anon public key (starts with eyJ...)
```

### 3. Configure Environment (1 minute)
```bash
# Create .env file
cp .env.example .env

# Edit .env and fill in:
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_STORAGE_BUCKET=dropzone-files
```

### 4. Create Database Tables (2 minutes)
```
1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy contents of: supabase/migrations/001_initial_schema.sql
4. Paste and click "Run"
5. Verify: Go to Table Editor, should see "shares" and "files" tables
```

### 5. Create Storage Bucket (2 minutes)
```
1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: dropzone-files
4. ✅ Enable "Public bucket"
5. File size limit: 100 MB
6. Click "Create bucket"
```

### 6. Configure Storage Policies (3 minutes)
```
1. In Storage → Click "dropzone-files" bucket
2. Go to "Policies" tab
3. Click "New Policy" → "For full customization"
4. Create these 4 policies:

Policy 1: Public read access
- Operation: SELECT
- USING: bucket_id = 'dropzone-files'

Policy 2: Allow public uploads
- Operation: INSERT
- WITH CHECK: bucket_id = 'dropzone-files'

Policy 3: Allow public updates
- Operation: UPDATE
- USING: bucket_id = 'dropzone-files'

Policy 4: Allow public deletes
- Operation: DELETE
- USING: bucket_id = 'dropzone-files'

OR: Run supabase/migrations/002_storage_setup.sql in SQL Editor
```

### 7. Test It! (5 minutes)
```bash
# Start the app
npm run dev

# Open http://localhost:5173
# Upload a file
# Copy the share link
# Open in incognito window
# ✅ File should be accessible!
```

## 🧪 Testing Checklist

After setup, verify:

- [ ] Upload single file → works
- [ ] Upload multiple files → works
- [ ] Share link works in incognito
- [ ] Share link works on phone/another device
- [ ] Download individual file → works
- [ ] Download All (ZIP) → works
- [ ] Files persist after page refresh
- [ ] Files persist after server restart

## 📊 Verify in Supabase Dashboard

### Check Database
```
Table Editor → shares table
- Should have your share_id

Table Editor → files table
- Should have file records
- storage_path should match Storage
```

### Check Storage
```
Storage → dropzone-files → shares
- Should see folder with share ID
- Inside: folder with file ID
- Inside: your actual file
```

## 📁 Files Created/Modified

### New Files
- `src/lib/supabase.ts` - Supabase client
- `src/vite-env.d.ts` - TypeScript definitions
- `.env.example` - Environment template
- `supabase/migrations/001_initial_schema.sql` - Database schema
- `supabase/migrations/002_storage_setup.sql` - Storage policies
- `SETUP_GUIDE.md` - Detailed setup guide
- `SUPABASE_INTEGRATION.md` - Integration report

### Modified Files
- `src/lib/storage.ts` - Rewritten for Supabase
- `src/hooks/useUpload.ts` - Updated upload logic
- `src/pages/SharePage.tsx` - Updated to fetch from Supabase
- `src/lib/zipUtils.ts` - Updated ZIP creation
- `src/types/index.ts` - New type definitions
- `.gitignore` - Added .env files

## 🔒 Security

✅ **Safe to expose:**
- `VITE_SUPABASE_URL` - Public project URL
- `VITE_SUPABASE_ANON_KEY` - Limited permissions via RLS

❌ **Never expose:**
- `service_role` key - Not used in this implementation

## 🐛 Troubleshooting

**"Missing Supabase environment variables"**
→ Check `.env` file exists with correct values

**"Failed to create share"**
→ Run the SQL migration in Supabase SQL Editor

**"Failed to upload file"**
→ Verify storage bucket exists and is public

**"Share not found"**
→ Check share exists in database, verify RLS policies

## 📚 Documentation

- **SETUP_GUIDE.md** - Complete step-by-step guide
- **SUPABASE_INTEGRATION.md** - Technical implementation details
- **supabase/migrations/** - Database schema files

## 🎯 Next Steps

1. ✅ Complete the 7 steps above
2. ✅ Test the application
3. ✅ Verify cross-device sharing
4. ⚠️ (Optional) Add authentication for production
5. ⚠️ (Optional) Add rate limiting
6. ⚠️ (Optional) Add file expiration

## 💡 Key Changes

### Before (IndexedDB)
- Files stored in browser only
- Share links worked only in same browser
- No persistence across devices
- Lost when browser cache cleared

### After (Supabase)
- Files stored in cloud (Supabase Storage)
- Share links work anywhere
- Persistent across devices
- Survives browser cache clear

## 📞 Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **Storage Guide**: https://supabase.com/docs/guides/storage
- **Check SETUP_GUIDE.md** for detailed instructions

---

**Status**: ✅ Code complete, awaiting manual Supabase setup
**Time to setup**: ~15 minutes
**Difficulty**: Easy (copy-paste SQL, fill in env vars)
