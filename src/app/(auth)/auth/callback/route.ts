import { NextResponse } from 'next/server'

// Redirect to client-side handler that has access to the PKCE code_verifier
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  // Forward all params to the client-side confirm page
  const confirmUrl = new URL('/auth/confirm', origin)
  searchParams.forEach((value, key) => {
    confirmUrl.searchParams.set(key, value)
  })

  // Preserve the 'next' param for post-login redirect
  const next = searchParams.get('next')
  if (next) {
    confirmUrl.searchParams.set('next', next)
  }

  return NextResponse.redirect(confirmUrl)
}
