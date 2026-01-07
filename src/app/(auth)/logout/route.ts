import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Sign out on the server - this properly clears cookies
  await supabase.auth.signOut()

  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/login`, { status: 302 })
}

// Also handle GET for simple link-based logout
export async function GET(request: Request) {
  const supabase = await createClient()

  await supabase.auth.signOut()

  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/login`, { status: 302 })
}
