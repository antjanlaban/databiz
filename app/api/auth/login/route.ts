import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/src/domains/identity/services/AuthService';
import { createInviteSchema } from '@/src/domains/identity/schemas/invite.schema';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  password: z.string().min(1, 'Wachtwoord is verplicht'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const authService = new AuthService();
    const result = await authService.login(email, password);

    return NextResponse.json(
      {
        success: true,
        data: {
          user: result.user,
        },
        message: 'Succesvol ingelogd',
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.issues[0]?.message || 'Validation error',
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: 'AUTH_ERROR',
          message: error.message,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: 'Onbekende fout bij inloggen',
      },
      { status: 500 }
    );
  }
}

