import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET?.trim() || 'dropzone-files';

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

// Get the raw configuration for paths that need direct REST calls (upload progress).
export function getSupabaseCredentials(): { url: string; anonKey: string } | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return { url: supabaseUrl, anonKey: supabaseAnonKey };
}

// Get configuration error message if not configured
export function getConfigurationError(): string | null {
  if (!supabaseUrl && !supabaseAnonKey) {
    return 'Both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing';
  }
  if (!supabaseUrl) {
    return 'VITE_SUPABASE_URL is missing';
  }
  if (!supabaseAnonKey) {
    return 'VITE_SUPABASE_ANON_KEY is missing';
  }
  return null;
}

// A partially configured environment is almost always a deployment mistake and
// should not silently look like intentional local-only mode.
export function getPartialConfigurationError(): string | null {
  if (Boolean(supabaseUrl) === Boolean(supabaseAnonKey)) return null;
  return getConfigurationError();
}

// Lazy initialization - only create client when actually needed
let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!);
  }

  return supabaseClient;
}
