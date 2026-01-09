import { z } from 'zod';
import { inviteRoleSchema, userStatusSchema } from './invite.schema';

export const updateUserStatusSchema = z.object({
  status: userStatusSchema,
});

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  role: inviteRoleSchema,
  company_id: z.string().uuid().nullable(),
  status: userStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

