
import { createClient } from '@supabase/supabase-js';

// Use process.env to access environment variables to resolve ImportMeta property errors
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Diagnostic pour la console
if (typeof window !== 'undefined') {
  console.log("[Supabase Diagnostic] URL:", !!supabaseUrl);
  console.log("[Supabase Diagnostic] Key:", !!supabaseAnonKey);
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
