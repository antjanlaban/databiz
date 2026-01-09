import { getSupabaseServer } from '@/lib/supabase-server';
import type { UserProfile, User } from '../types/user.types';
import type { InviteRole, UserStatus } from '../types/invite.types';

export class UserService {
  private supabase = getSupabaseServer();

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as UserProfile;
  }

  /**
   * Get full user (with email from auth.users)
   */
  async getUser(userId: string): Promise<User | null> {
    // Get profile
    const profile = await this.getUserProfile(userId);
    if (!profile) {
      return null;
    }

    // Get email from auth.users
    const { data: authUser, error } = await this.supabase.auth.admin.getUserById(userId);
    if (error || !authUser?.user?.email) {
      return null;
    }

    return {
      id: userId,
      email: authUser.user.email,
      profile,
    };
  }

  /**
   * List users (filtered by permissions)
   */
  async listUsers(
    userId: string,
    userRole: InviteRole,
    userCompanyId: string | null
  ): Promise<User[]> {
    let query = this.supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by permissions
    if (userRole === 'admin') {
      // Admin sees all
      // No filter needed
    } else if (userRole === 'business_admin') {
      // Business admin sees only users in their company
      query = query.eq('company_id', userCompanyId);
    } else {
      // Worker sees only themselves
      query = query.eq('id', userId);
    }

    const { data: profiles, error } = await query;

    if (error) {
      throw new Error(`Fout bij ophalen gebruikers: ${error.message}`);
    }

    if (!profiles || profiles.length === 0) {
      return [];
    }

    // Get emails for all users
    const users: User[] = [];
    for (const profile of profiles) {
      const { data: authUser } = await this.supabase.auth.admin.getUserById(profile.id);
      if (authUser?.user?.email) {
        users.push({
          id: profile.id,
          email: authUser.user.email,
          profile: profile as UserProfile,
        });
      }
    }

    return users;
  }

  /**
   * Update user status (only Admin)
   */
  async updateUserStatus(
    targetUserId: string,
    status: UserStatus,
    currentUserId: string,
    currentUserRole: InviteRole
  ): Promise<UserProfile> {
    // Only admin can update status
    if (currentUserRole !== 'admin') {
      throw new Error('Alleen admins kunnen gebruikersstatus wijzigen');
    }

    const { data, error } = await this.supabase
      .from('user_profiles')
      .update({ status })
      .eq('id', targetUserId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Fout bij bijwerken status: ${error?.message || 'Onbekende fout'}`);
    }

    return data as UserProfile;
  }

  /**
   * Get current user with profile
   */
  async getCurrentUser(userId: string): Promise<User | null> {
    return this.getUser(userId);
  }
}

