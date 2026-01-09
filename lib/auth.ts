import { supabase } from './supabase';
import type { User } from '@/src/domains/identity/types/user.types';

/**
 * Client-side auth helpers
 */

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email!,
    profile: profile as any,
  };
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

