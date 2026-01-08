import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const supabase = (() => {
  if (typeof window === 'undefined') {
    // Server-side: return a mock or empty client
    return null as any;
  }
  
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseInstance;
})();
