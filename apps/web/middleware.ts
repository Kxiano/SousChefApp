import { type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { updateSession } from './utils/supabase/middleware'

const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'pt-BR'],
 
  // Used when no locale matches
  defaultLocale: 'en'
})

export async function middleware(request: NextRequest) {
  // Run next-intl middleware first to get locale-based response
  const response = intlMiddleware(request)
  
  // Then run Supabase session updates on top of that response
  return await updateSession(request, response)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes - exclude from locale prefixing)
     * - auth/signout (specific endpoint)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|auth/signout|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
