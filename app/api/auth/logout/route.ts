import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/src/domains/identity/services/AuthService';

export async function POST(request: NextRequest) {
  try {
    const authService = new AuthService();
    await authService.logout();

    return NextResponse.json(
      { message: 'Succesvol uitgelogd' },
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
      { error: 'Onbekende fout bij uitloggen' },
      { status: 500 }
    );
  }
}

