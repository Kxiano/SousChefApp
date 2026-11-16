import { type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './lib/routing'
import { updateSession } from './utils/supabase/middleware'

const intlMiddleware = createMiddleware(routing)

export async function proxy(request: NextRequest) {
  const response = intlMiddleware(request)

  // next-intl is adding a missing locale prefix (e.g. "/" -> "/en"); the
  // redirected request comes back through here and is checked then.
  if (response.headers.has('location')) return response

  return updateSession(request, response)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (build output and image optimisation)
     * - favicon.ico and other static images
     * - api (API routes, no locale prefix)
     * - auth/signout (route handler outside the locale folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|auth/signout|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
