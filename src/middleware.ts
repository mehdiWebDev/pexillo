import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './i18n/config'

// Create the internationalization middleware
const handleI18nRouting = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed' // This means: "/" for default locale, "/fr" for French
})

export async function middleware(request: NextRequest) {
  console.log('🔥 Middleware triggered:', request.nextUrl.pathname)

  // First, handle internationalization routing
  const response = handleI18nRouting(request)

  // Extract locale from the URL
  const pathname = request.nextUrl.pathname
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  )

  // Determine the current locale
  let locale = defaultLocale
  for (const l of locales) {
    if (pathname.startsWith(`/${l}/`) || pathname === `/${l}`) {
      locale = l
      break
    }
  }

  // Get pathname without locale for route checking
  const pathWithoutLocale = pathname.startsWith(`/${locale}`)
    ? pathname.slice(locale.length + 1) || '/'
    : pathname

  // Create Supabase client with the response from i18n middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (pathWithoutLocale.startsWith('/dashboard') && !user) {
    // Redirect to login with locale
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/auth/login`
    return NextResponse.redirect(url)
  }

  // Protect admin routes
  if (pathWithoutLocale.startsWith('/admin') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/auth/login`
    return NextResponse.redirect(url)
  }

  // Check if user is admin for admin routes
  if (pathWithoutLocale.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}/dashboard`
      return NextResponse.redirect(url)
    }
  }

  // Redirect logged-in users away from auth pages
  const authPaths = ['/auth/login', '/auth/signup', '/auth/sign-up']
  if (authPaths.some(path => pathWithoutLocale === path || pathWithoutLocale.startsWith(`${path}/`)) && user) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/dashboard`
    return NextResponse.redirect(url)
  }

  // Return the response with all cookies properly set
  return response
}

export const config = {
  matcher: [
    // Skip all internal paths (_next, _vercel, etc.)
    '/((?!api|_next|_vercel|.*\\..*).*)',
    // Optional: only run on root (/) route and all other pages
    '/',
    '/(fr|en)/:path*',
  ]
}