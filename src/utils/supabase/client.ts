import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

export function createClient(): SupabaseClient {
  const url = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createSupabaseClient(url, key);
}
