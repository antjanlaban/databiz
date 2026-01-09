import { getSupabaseServer } from '@/lib/supabase-server';
import type { 
  UserInvite, 
  CreateInviteInput, 
  ValidateInviteResult, 
  AcceptInviteInput 
} from '../types/invite.types';
import type { InviteRole } from '../types/invite.types';

export class InviteService {
  private supabase = getSupabaseServer();

  /**
   * Create a new invite
   * - Admin can create business_admin invites (must specify company_id)
   * - Business Admin can create worker invites (company_id auto-filled from creator)
   */
  async createInvite(
    input: CreateInviteInput,
    createdBy: string,
    creatorRole: InviteRole,
    creatorCompanyId: string | null
  ): Promise<{ invite: UserInvite; inviteLink: string }> {
    // Permission checks
    if (input.role === 'business_admin' && creatorRole !== 'admin') {
      throw new Error('Alleen admins kunnen business admins aanmaken');
    }
    if (input.role === 'worker' && creatorRole !== 'business_admin') {
      throw new Error('Alleen business admins kunnen workers aanmaken');
    }

    // Determine company_id
    let companyId: string | null = null;
    if (input.role === 'business_admin') {
      if (!input.company_id) {
        throw new Error('Company ID is verplicht voor business admin');
      }
      companyId = input.company_id;
    } else if (input.role === 'worker') {
      if (!creatorCompanyId) {
        throw new Error('Business admin moet gekoppeld zijn aan een company');
      }
      companyId = creatorCompanyId;
    }
    // admin role: companyId stays null

    // Check if email already exists in auth.users
    const { data: usersList } = await this.supabase.auth.admin.listUsers();
    const existingUser = usersList?.users?.find(user => user.email === input.email);
    if (existingUser) {
      throw new Error('Dit e-mailadres is al in gebruik');
    }

    // Check if there's a pending invite for this email
    const { data: existingInvite } = await this.supabase
      .from('user_invites')
      .select('*')
      .eq('email', input.email)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      throw new Error('Er bestaat al een openstaande uitnodiging voor dit e-mailadres');
    }

    // Generate token (UUID)
    const token = crypto.randomUUID();

    // Calculate expiration (48 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Create invite record
    const { data: invite, error: inviteError } = await this.supabase
      .from('user_invites')
      .insert({
        email: input.email,
        token,
        role: input.role,
        company_id: companyId,
        created_by: createdBy,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (inviteError || !invite) {
      throw new Error(`Fout bij aanmaken uitnodiging: ${inviteError?.message || 'Onbekende fout'}`);
    }

    // Generate Supabase magic link
    const { data: linkData, error: linkError } = await this.supabase.auth.admin.generateLink({
      type: 'invite',
      email: input.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/accept-invite/${token}`,
      },
    });

    if (linkError || !linkData) {
      // Clean up invite if link generation fails
      await this.supabase.from('user_invites').delete().eq('id', invite.id);
      throw new Error(`Fout bij genereren link: ${linkError?.message || 'Onbekende fout'}`);
    }

    return {
      invite: invite as UserInvite,
      inviteLink: linkData.properties.action_link,
    };
  }

  /**
   * Validate an invite token
   */
  async validateInvite(token: string): Promise<ValidateInviteResult> {
    const { data: invite, error } = await this.supabase
      .from('user_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !invite) {
      return {
        valid: false,
        error: 'Uitnodiging niet gevonden',
      };
    }

    // Check if already accepted
    if (invite.status === 'accepted') {
      return {
        valid: false,
        error: 'Deze uitnodiging is al geaccepteerd',
      };
    }

    // Check if expired
    const expiresAt = new Date(invite.expires_at);
    const now = new Date();
    if (now > expiresAt) {
      // Mark as expired
      await this.supabase
        .from('user_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id);

      return {
        valid: false,
        error: 'Deze uitnodiging is verlopen (48 uur)',
      };
    }

    return {
      valid: true,
      invite: invite as UserInvite,
    };
  }

  /**
   * Accept an invite and create user
   */
  async acceptInvite(input: AcceptInviteInput): Promise<{ user: { id: string; email: string } }> {
    // Validate invite
    const validation = await this.validateInvite(input.token);
    if (!validation.valid || !validation.invite) {
      throw new Error(validation.error || 'Uitnodiging is ongeldig');
    }

    const invite = validation.invite;

    // Create user in Supabase Auth
    const { data: userData, error: userError } = await this.supabase.auth.admin.createUser({
      email: invite.email,
      password: input.password,
      email_confirm: true, // Auto-confirm since we're using invites
    });

    if (userError || !userData.user) {
      throw new Error(`Fout bij aanmaken gebruiker: ${userError?.message || 'Onbekende fout'}`);
    }

    // Create user profile
    const { error: profileError } = await this.supabase
      .from('user_profiles')
      .insert({
        id: userData.user.id,
        role: invite.role,
        company_id: invite.company_id,
        status: 'active',
      });

    if (profileError) {
      // Clean up: delete user if profile creation fails
      await this.supabase.auth.admin.deleteUser(userData.user.id);
      throw new Error(`Fout bij aanmaken profiel: ${profileError.message}`);
    }

    // Update invite status
    await this.supabase
      .from('user_invites')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    return {
      user: {
        id: userData.user.id,
        email: userData.user.email!,
      },
    };
  }

  /**
   * Regenerate invite link (for password recovery)
   */
  async regenerateInvite(inviteId: string, createdBy: string): Promise<{ inviteLink: string }> {
    // Get existing invite
    const { data: invite, error } = await this.supabase
      .from('user_invites')
      .select('*')
      .eq('id', inviteId)
      .single();

    if (error || !invite) {
      throw new Error('Uitnodiging niet gevonden');
    }

    // Check permissions (only admin can regenerate)
    // This will be checked at API level, but we verify here too
    if (invite.status === 'accepted') {
      throw new Error('Kan geen nieuwe link genereren voor geaccepteerde uitnodiging');
    }

    // Generate new token
    const newToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Update invite with new token and expiration
    const { error: updateError } = await this.supabase
      .from('user_invites')
      .update({
        token: newToken,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        created_by: createdBy,
      })
      .eq('id', inviteId);

    if (updateError) {
      throw new Error(`Fout bij bijwerken uitnodiging: ${updateError.message}`);
    }

    // Generate new Supabase magic link
    const { data: linkData, error: linkError } = await this.supabase.auth.admin.generateLink({
      type: 'invite',
      email: invite.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/accept-invite/${newToken}`,
      },
    });

    if (linkError || !linkData) {
      throw new Error(`Fout bij genereren link: ${linkError?.message || 'Onbekende fout'}`);
    }

    return {
      inviteLink: linkData.properties.action_link,
    };
  }

  /**
   * List invites (filtered by permissions)
   */
  async listInvites(
    userId: string,
    userRole: InviteRole,
    userCompanyId: string | null
  ): Promise<UserInvite[]> {
    let query = this.supabase.from('user_invites').select('*').order('created_at', { ascending: false });

    // Filter by permissions
    if (userRole === 'admin') {
      // Admin sees all
      // No filter needed
    } else if (userRole === 'business_admin') {
      // Business admin sees only invites for their company
      query = query.eq('company_id', userCompanyId);
    } else {
      // Worker sees only invites they created (shouldn't happen, but safe)
      query = query.eq('created_by', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Fout bij ophalen uitnodigingen: ${error.message}`);
    }

    return (data || []) as UserInvite[];
  }
}

