export type InviteRole = 'admin' | 'business_admin' | 'worker';
export type InviteStatus = 'pending' | 'accepted' | 'expired';
export type UserStatus = 'pending_invite' | 'active' | 'inactive';

export interface UserInvite {
  id: string;
  email: string;
  token: string;
  role: InviteRole;
  company_id: string | null;
  created_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  status: InviteStatus;
  created_at: string;
}

export interface CreateInviteInput {
  email: string;
  role: InviteRole;
  company_id?: string | null;
}

export interface ValidateInviteResult {
  valid: boolean;
  invite?: UserInvite;
  error?: string;
}

export interface AcceptInviteInput {
  token: string;
  password: string;
}

