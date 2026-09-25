-- DropZone Storage Bucket Setup
-- This file documents the required Supabase Storage configuration
-- Storage buckets must be created via the Supabase Dashboard or API

-- ============================================
-- STORAGE BUCKET CREATION
-- ============================================
-- Create a bucket named 'dropzone-files' via the Supabase Dashboard:
-- 1. Go to Storage in your Supabase project
-- 2. Click "New bucket"
-- 3. Name: dropzone-files
-- 4. Public bucket: YES (files need to be publicly accessible via signed URLs)
-- 5. File size limit: 104857600 (100 MB)
-- 6. Allowed MIME types: Leave empty (allow all)

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Allow public read access to all files
CREATE POLICY "Public read access"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'dropzone-files');

-- Allow public upload access
CREATE POLICY "Allow public uploads"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'dropzone-files');

-- Allow public update access (for resumable uploads)
CREATE POLICY "Allow public updates"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'dropzone-files');

-- Allow public delete access (for cleanup)
CREATE POLICY "Allow public deletes"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'dropzone-files');

-- ============================================
-- STORAGE PATH STRUCTURE
-- ============================================
-- Files are stored with the following path structure:
-- shares/{shareId}/{fileId}/{originalFilename}
--
-- Example:
-- shares/abc123-def456/file789-uvw/photo.png
--
-- This structure:
-- 1. Groups files by share for easy management
-- 2. Uses fileId to prevent filename collisions
-- 3. Preserves original filename for downloads
