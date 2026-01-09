import { NextRequest, NextResponse } from 'next/server';
import { InviteService } from '@/src/domains/identity/services/InviteService';
import { UserService } from '@/src/domains/identity/services/UserService';
import { createInviteSchema } from '@/src/domains/identity/schemas/invite.schema';
import { getSupabaseServer } from '@/lib/supabase-server';
import { z } from 'zod';

/**
 * GET /api/auth/invites - List invites (filtered by permissions)
 * POST /api/auth/invites - Create new invite
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user from session
    const supabase = getSupabaseServer();
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Niet geautoriseerd',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Niet geautoriseerd',
        },
        { status: 401 }
      );
    }

    // Get user profile
    const userService = new UserService();
    const profile = await userService.getUserProfile(user.id);
    
    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Gebruikersprofiel niet gevonden',
        },
        { status: 404 }
      );
    }

    // List invites
    const inviteService = new InviteService();
    const invites = await inviteService.listInvites(
      user.id,
      profile.role,
      profile.company_id
    );

    return NextResponse.json(
      {
        success: true,
        data: { invites },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: 'SERVER_ERROR',
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: 'Onbekende fout',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get current user from session
    const supabase = getSupabaseServer();
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Niet geautoriseerd',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Niet geautoriseerd',
        },
        { status: 401 }
      );
    }

    // Get user profile
    const userService = new UserService();
    const profile = await userService.getUserProfile(user.id);
    
    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Gebruikersprofiel niet gevonden',
        },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const input = createInviteSchema.parse(body);

    // Create invite
    const inviteService = new InviteService();
    const result = await inviteService.createInvite(
      input,
      user.id,
      profile.role,
      profile.company_id
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          invite: result.invite,
          inviteLink: result.inviteLink,
        },
        message: 'Uitnodiging aangemaakt',
      },
      { status: 201 }
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
          error: 'BAD_REQUEST',
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: 'Onbekende fout bij aanmaken uitnodiging',
      },
      { status: 500 }
    );
  }
}

