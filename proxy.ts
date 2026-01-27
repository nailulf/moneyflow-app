import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/session';

export async function proxy(request: NextRequest) {
  // First, run the Supabase auth middleware
  const response = await updateSession(request);

  // If the response is a redirect, we return it immediately
  if (response.status === 307 || response.status === 308 || response.status === 302) {
    return response;
  }

  // Add custom headers for client-side tracking
  // We clone the response to modify headers if needed, 
  // but updateSession already returns a response with headers we can modify
  
  // Note: response is immutable in some contexts, so we might need to create a new one
  // but updateSession returns a NextResponse that we should be able to modify or copy
  
  // Set headers for tracking
  response.headers.set('x-page-path', request.nextUrl.pathname);
  response.headers.set('x-referrer', request.headers.get('referer') || '');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
