import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Pages that support section filtering
const SECTION_FILTER_PATHS = ['/dashboard', '/scouts', '/billing', '/reports', '/payments', '/accounts']

// Add security headers to response
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY')

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Enable XSS protection (legacy, but still useful for older browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Permissions Policy - restrict powerful features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  return response
}

export async function middleware(request: NextRequest) {
  // First, handle Supabase session
  let response = await updateSession(request)

  // Add security headers to all responses
  response = addSecurityHeaders(response)

  // Check if this is a page that supports section filtering
  const pathname = request.nextUrl.pathname
  const supportsSectionFilter = SECTION_FILTER_PATHS.some(p => pathname.startsWith(p))

  if (supportsSectionFilter) {
    // Check if URL already has section param
    const hasSection = request.nextUrl.searchParams.has('section')

    if (!hasSection) {
      // Check for section cookie
      const sectionCookie = request.cookies.get('chuckbox_section_filter')?.value

      if (sectionCookie && ['boys', 'girls'].includes(sectionCookie)) {
        // Redirect to include the section param
        const url = request.nextUrl.clone()
        url.searchParams.set('section', sectionCookie)
        return NextResponse.redirect(url)
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (for webhooks etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
