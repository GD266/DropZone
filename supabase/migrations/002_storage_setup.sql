-- DropZone Storage Bucket Setup
-- Creates the storage bucket (idempotent) and the public storage policies.
-- Safe to run multiple times; run after 001_initial_schema.sql.

-- ============================================
-- STORAGE BUCKET CREATION
-- ============================================
-- Creates a PUBLIC bucket named 'dropzone-files' with a 100 MB per-file limit
-- (the app uses direct public download URLs). Re-running updates an existing
-- bucket to the required settings instead of failing.
--
-- If you use a custom VITE_SUPABASE_STORAGE_BUCKET, replace the bucket name
-- here and in the policies below as well.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('dropzone-files', 'dropzone-files', true, 104857600)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 104857600;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Allow public read access to all files
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Public read access"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'dropzone-files');

-- Allow public upload access
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
CREATE POLICY "Allow public uploads"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'dropzone-files');

-- Allow public update access (for resumable uploads)
DROP POLICY IF EXISTS "Allow public updates" ON storage.objects;
CREATE POLICY "Allow public updates"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'dropzone-files');

-- Allow public delete access (for cleanup)
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;
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
