import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'dropzone-files';

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
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

// Lazy initialization - only create client when actually needed
let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
    );
  }
  
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!);
  }
  
  return supabaseClient;
}

// For backward compatibility - export a proxy that throws helpful error
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!isSupabaseConfigured()) {
      throw new Error(
        'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
      );
    }
    
    if (!supabaseClient) {
      supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!);
    }
    
    return (supabaseClient as any)[prop];
  }
});
