import { NextResponse } from 'next/server'

// Legacy callback route - forwards to /auth/confirm with all parameters
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  // Forward all search params to the confirm page
  const confirmUrl = new URL('/auth/confirm', origin)
  searchParams.forEach((value, key) => {
    confirmUrl.searchParams.set(key, value)
  })

  return NextResponse.redirect(confirmUrl)
}
