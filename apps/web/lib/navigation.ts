import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

export { routing, isLocale, safeRedirectPath, stripLocale, type Locale } from './routing'

// Locale-aware replacements for next/link and next/navigation: hrefs are written
// without a locale prefix ("/recipes") and the current locale is added for you.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
