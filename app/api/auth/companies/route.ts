import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { UserService } from '@/src/domains/identity/services/UserService';

/**
 * GET /api/auth/companies - List companies (Admin only)
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

    // Only admin can list all companies
    if (profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Alleen admins kunnen alle companies zien' },
        { status: 403 }
      );
    }

    // List companies
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Fout bij ophalen companies: ${error.message}`);
    }

    return NextResponse.json({ companies: companies || [] }, { status: 200 });
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

