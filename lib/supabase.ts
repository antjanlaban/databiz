import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Client-side Supabase client with SSR cookie support
 * This should only be used in client components (use 'use client')
 */
export function createClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error('createClient() from lib/supabase.ts should only be called client-side. Use lib/supabase-auth.ts for server-side.');
  }

  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials are required. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.');
    }
    
    // Use createBrowserClient from @supabase/ssr for proper cookie handling
    supabaseInstance = createBrowserClient(supabaseUrl, supabaseKey);
  }
  
  return supabaseInstance;
}

// Export a singleton instance for backward compatibility
// Uses a Proxy to lazy-load and provide proper error messages
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (typeof window === 'undefined') {
      throw new Error('supabase client from lib/supabase.ts can only be used client-side. Use lib/supabase-auth.ts for server-side.');
    }
    const client = createClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
