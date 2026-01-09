import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/src/domains/identity/services/UserService';
import { getSupabaseServer } from '@/lib/supabase-server';

/**
 * GET /api/auth/users - List users (filtered by permissions)
 * Only admin and business_admin can access this endpoint
 */
export async function GET(request: NextRequest) {
  try {
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

    // Check authorization: only admin and business_admin can access this endpoint
    if (profile.role !== 'admin' && profile.role !== 'business_admin') {
      return NextResponse.json(
        { error: 'Alleen admins en business admins kunnen gebruikers bekijken' },
        { status: 403 }
      );
    }

    // List users
    const users = await userService.listUsers(
      user.id,
      profile.role,
      profile.company_id
    );

    return NextResponse.json({ users }, { status: 200 });
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

