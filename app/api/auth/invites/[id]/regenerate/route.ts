import { NextRequest, NextResponse } from 'next/server';
import { InviteService } from '@/src/domains/identity/services/InviteService';
import { UserService } from '@/src/domains/identity/services/UserService';
import { getSupabaseServer } from '@/lib/supabase-server';

/**
 * POST /api/auth/invites/:id/regenerate - Regenerate invite link (Admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get current user from session
    const supabase = getSupabaseServer();
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      );
    }

    // Get user profile
    const userService = new UserService();
    const profile = await userService.getUserProfile(user.id);
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Gebruikersprofiel niet gevonden' },
        { status: 404 }
      );
    }

    // Only admin can regenerate
    if (profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Alleen admins kunnen links opnieuw genereren' },
        { status: 403 }
      );
    }

    // Regenerate invite
    const inviteService = new InviteService();
    const result = await inviteService.regenerateInvite(id, user.id);

    return NextResponse.json(
      {
        inviteLink: result.inviteLink,
        message: 'Nieuwe link gegenereerd',
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Onbekende fout bij genereren link' },
      { status: 500 }
    );
  }
}

