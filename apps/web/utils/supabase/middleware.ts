import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest, customResponse?: NextResponse) {
  let supabaseResponse = customResponse || NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const pathnameWithoutLocale = pathname.replace(/^\/(en|pt-BR)(\/|$)/, '/')
  const match = pathname.match(/^\/(en|pt-BR)(\/|$)/)
  const localePrefix = match ? `/${match[1]}` : ''

  const isAuthRoute = pathnameWithoutLocale.startsWith('/login') || 
                      pathnameWithoutLocale.startsWith('/signup') || 
                      pathnameWithoutLocale.startsWith('/invite')
  
  if (
    !user &&
    !isAuthRoute &&
    pathnameWithoutLocale !== '/'
  ) {
    const url = request.nextUrl.clone()
    url.pathname = `${localePrefix}/login`
    return NextResponse.redirect(url)
  }

  if (user && !isAuthRoute && pathnameWithoutLocale !== '/billing-locked') {
    // Check subscription status
    const { data: profile } = await supabase
      .from('profiles')
      .select('restaurant_id')
      .eq('id', user.id)
      .single()

    if (profile) {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('subscription_status, grace_period_ends_at')
        .eq('id', profile.restaurant_id)
        .single()

      if (restaurant) {
        const status = restaurant.subscription_status
        const graceEnds = restaurant.grace_period_ends_at ? new Date(restaurant.grace_period_ends_at) : null
        
        let isLocked = false
        
        if (status === 'canceled') {
          isLocked = true
        } else if (status === 'past_due' && graceEnds && graceEnds < new Date()) {
          isLocked = true
        }

        if (isLocked) {
          const url = request.nextUrl.clone()
          url.pathname = `${localePrefix}/billing-locked`
          return NextResponse.redirect(url)
        }
      }
    }
  }
  return supabaseResponse
}
