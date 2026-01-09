import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/src/domains/identity/services/AuthService';

export async function GET(request: NextRequest) {
  try {
    const authService = new AuthService();
    const user = await authService.getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Niet ingelogd' },
        { status: 401 }
      );
    }

    return NextResponse.json({ user }, { status: 200 });
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

