import { getSupabaseServer } from '@/lib/supabase-server';
import { supabase } from '@/lib/supabase';
import type { User } from '../types/user.types';
import { UserService } from './UserService';

export class AuthService {
  private supabase = getSupabaseServer();
  private userService = new UserService();

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<{ user: User; session: any }> {
    // Use client-side supabase for login (handles cookies automatically)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user || !data.session) {
      throw new Error(error?.message || 'Ongeldige inloggegevens');
    }

    // Get user profile
    const user = await this.userService.getUser(data.user.id);
    if (!user) {
      throw new Error('Gebruikersprofiel niet gevonden');
    }

    // Check if user is active
    if (user.profile.status !== 'active') {
      // Sign out if not active
      await supabase.auth.signOut();
      throw new Error('Je account is niet actief. Neem contact op met een beheerder.');
    }

    return {
      user,
      session: data.session,
    };
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(`Fout bij uitloggen: ${error.message}`);
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<any | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return null;
    }
    return data.session;
  }

  /**
   * Get current user from session
   */
  async getCurrentUser(): Promise<User | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return null;
    }

    return this.userService.getUser(data.user.id);
  }

  /**
   * Server-side: Get user from request (for API routes)
   */
  async getUserFromRequest(request: Request): Promise<User | null> {
    // Get session from cookies
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    // Verify token and get user
    const { data, error } = await this.supabase.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }

    return this.userService.getUser(data.user.id);
  }
}

