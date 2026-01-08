import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client with service role key
 * This client has elevated permissions and should ONLY be used in API routes/server-side code
 * 
 * NEVER expose this client to the client-side or include the service role key in client bundles
 */

let supabaseServerInstance: SupabaseClient | null = null;

/**
 * Get or create server-side Supabase client with service role key
 * @throws Error if called on client-side or if credentials are missing
 */
export function getSupabaseServer(): SupabaseClient {
  // Ensure this is only used server-side
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseServer() can only be called server-side');
  }

  if (!supabaseServerInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        'Supabase server credentials are required. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.'
      );
    }

    supabaseServerInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseServerInstance;
}

