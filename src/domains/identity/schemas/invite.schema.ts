import { z } from 'zod';

export const inviteRoleSchema = z.enum(['admin', 'business_admin', 'worker']);
export const inviteStatusSchema = z.enum(['pending', 'accepted', 'expired']);
export const userStatusSchema = z.enum(['pending_invite', 'active', 'inactive']);

export const createInviteSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  role: inviteRoleSchema,
  company_id: z.string().uuid().nullable().optional(),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Token is verplicht'),
  password: z.string().min(8, 'Wachtwoord moet minimaal 8 karakters lang zijn'),
});

export const validateInviteSchema = z.object({
  token: z.string().min(1, 'Token is verplicht'),
});

