import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Early return for upload route - skip ALL processing to avoid body consumption
  // This is critical for large file uploads (34+ MB)
  if (pathname === '/api/upload') {
    console.log('[Middleware] Upload route, skipping all processing');
    return NextResponse.next();
  }
  
  // Debug logging
  console.log('[Middleware] Processing request:', pathname);
  
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('[Middleware] Environment check:', {
    url: supabaseUrl ? `✅ Set (${supabaseUrl.substring(0, 20)}...)` : '❌ Missing',
    key: supabaseKey ? '✅ Set' : '❌ Missing',
  });

  // If credentials are missing, handle gracefully
  if (!supabaseUrl || !supabaseKey) {
    console.error('[Middleware] ❌ Missing Supabase credentials!');
    console.error('[Middleware] NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.error('[Middleware] NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'Missing');
    
    // For API routes, return error
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          success: false,
          error: 'CONFIGURATION_ERROR',
          message: 'Server configuration error: Missing Supabase credentials',
        },
        { status: 500 }
      );
    }
    
    // For pages, allow public routes only
    const publicRoutes = ['/login', '/accept-invite'];
    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
    
    if (!isPublicRoute) {
      console.log('[Middleware] Redirecting to login (missing credentials)');
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    });

    console.log('[Middleware] Attempting to get user...');
    let user = null;
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('[Middleware] Auth error:', authError.message);
      } else {
        user = authUser;
        console.log('[Middleware] User:', user ? `✅ ${user.email}` : '❌ Not authenticated');
      }
    } catch (error) {
      console.error('[Middleware] Error getting user:', error);
      if (error instanceof Error) {
        console.error('[Middleware] Error details:', error.message, error.stack);
      }
    }

    // Public routes (no auth required)
    const publicRoutes = ['/login', '/accept-invite'];
    const isPublicRoute = publicRoutes.some((route) =>
      pathname.startsWith(route)
    );

    // API routes - let them handle auth themselves
    // IMPORTANT: Don't consume the request body for API routes, especially for file uploads
    if (pathname.startsWith('/api/')) {
      console.log('[Middleware] API route, allowing through');
      // Return early without creating a response that might consume the body
      // Use NextResponse.next() directly to pass through the original request
      return NextResponse.next();
    }

    // If user is not authenticated and trying to access protected route
    if (!user && !isPublicRoute) {
      console.log('[Middleware] Not authenticated, redirecting to login');
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // If user is authenticated and trying to access login page
    if (user && pathname === '/login') {
      console.log('[Middleware] Authenticated user on login page, redirecting to home');
      return NextResponse.redirect(new URL('/', request.url));
    }

    console.log('[Middleware] ✅ Request allowed');
    return response;
  } catch (error) {
    console.error('[Middleware] ❌ Unexpected error:', error);
    if (error instanceof Error) {
      console.error('[Middleware] Error message:', error.message);
      console.error('[Middleware] Error stack:', error.stack);
    }
    
    // For API routes, return error response
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          success: false,
          error: 'MIDDLEWARE_ERROR',
          message: error instanceof Error ? error.message : 'Unexpected middleware error',
        },
        { status: 500 }
      );
    }
    
    // For pages, try to continue (might show error page)
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

