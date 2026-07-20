import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return NextResponse.redirect(new URL('/en/login', origin), { status: 302 })
}
