import { NextRequest, NextResponse } from 'next/server';
import { InviteService } from '@/src/domains/identity/services/InviteService';

/**
 * GET /api/auth/invites/validate?token=xxx - Validate invite token
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is verplicht' },
        { status: 400 }
      );
    }

    const inviteService = new InviteService();
    const result = await inviteService.validateInvite(token);

    if (!result.valid) {
      return NextResponse.json(
        { error: result.error || 'Uitnodiging is ongeldig' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        valid: true,
        invite: result.invite,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Onbekende fout' },
      { status: 500 }
    );
  }
}

