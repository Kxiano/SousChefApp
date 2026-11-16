import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { isLocale, routing } from '@/lib/routing'

// Lives outside app/[locale] so the plain /auth/signout URL works from any page.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  const locale = isLocale(cookieLocale) ? cookieLocale : routing.defaultLocale
  // 303 so the browser follows the redirect with GET, not another POST.
  return NextResponse.redirect(new URL(`/${locale}/login`, request.url), { status: 303 })
}
