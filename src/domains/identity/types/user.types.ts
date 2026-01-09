import type { InviteRole, UserStatus } from './invite.types';

export interface UserProfile {
  id: string;
  role: InviteRole;
  company_id: string | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  profile: UserProfile;
}

export interface CreateUserInput {
  email: string;
  password: string;
  role: InviteRole;
  company_id?: string | null;
}

