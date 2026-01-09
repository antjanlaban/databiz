import { NextRequest, NextResponse } from 'next/server';
import { InviteService } from '@/src/domains/identity/services/InviteService';
import { AuthService } from '@/src/domains/identity/services/AuthService';
import { acceptInviteSchema } from '@/src/domains/identity/schemas/invite.schema';
import { z } from 'zod';

/**
 * POST /api/auth/invites/accept - Accept invite and set password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = acceptInviteSchema.parse(body);

    const inviteService = new InviteService();
    const result = await inviteService.acceptInvite({ token, password });

    // Auto-login after accepting invite
    const authService = new AuthService();
    const loginResult = await authService.login(result.user.email, password);

    return NextResponse.json(
      {
        user: loginResult.user,
        message: 'Uitnodiging geaccepteerd en ingelogd',
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Onbekende fout bij accepteren uitnodiging' },
      { status: 500 }
    );
  }
}

