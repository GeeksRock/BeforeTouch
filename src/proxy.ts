import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/setup') || pathname.startsWith('/settings') || pathname.startsWith('/profile')

  if (isProtected) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.nextUrl))
    }

    const { data: employee } = await supabase
      .from('employee')
      .select('is_active')
      .eq('auth_user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (employee?.is_active === false) {
      return NextResponse.redirect(new URL('/login', request.nextUrl))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|svg|ico)$).*)'],
}
