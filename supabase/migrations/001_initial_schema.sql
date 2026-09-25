-- DropZone Database Schema Migration
-- Version: 1.0.0
-- Description: Initial schema for cloud-based file sharing

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SHARES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for fast share_id lookups
CREATE INDEX IF NOT EXISTS idx_shares_share_id ON public.shares(share_id);

-- ============================================
-- FILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Foreign key constraint
  CONSTRAINT fk_files_share_id 
    FOREIGN KEY (share_id) 
    REFERENCES public.shares(share_id) 
    ON DELETE CASCADE
);

-- Index for fast share_id lookups
CREATE INDEX IF NOT EXISTS idx_files_share_id ON public.files(share_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on both tables
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR SHARES
-- ============================================

-- Allow anyone to read shares (public access)
CREATE POLICY "Enable read access for all users"
  ON public.shares
  FOR SELECT
  USING (true);

-- Allow anyone to insert shares (public upload)
CREATE POLICY "Enable insert access for all users"
  ON public.shares
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to delete shares (for cleanup)
CREATE POLICY "Enable delete access for all users"
  ON public.shares
  FOR DELETE
  USING (true);

-- ============================================
-- RLS POLICIES FOR FILES
-- ============================================

-- Allow anyone to read files (public access)
CREATE POLICY "Enable read access for all users"
  ON public.files
  FOR SELECT
  USING (true);

-- Allow anyone to insert files (public upload)
CREATE POLICY "Enable insert access for all users"
  ON public.files
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to delete files (for cleanup)
CREATE POLICY "Enable delete access for all users"
  ON public.files
  FOR DELETE
  USING (true);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.shares IS 'Share collections containing multiple files';
COMMENT ON TABLE public.files IS 'Individual files belonging to a share';
COMMENT ON COLUMN public.shares.share_id IS 'Public unique identifier for the share (used in URLs)';
COMMENT ON COLUMN public.files.storage_path IS 'Path to the file in Supabase Storage';
COMMENT ON COLUMN public.files.original_name IS 'Original filename as uploaded by the user';
