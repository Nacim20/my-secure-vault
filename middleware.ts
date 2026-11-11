import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // sameSite: 'lax' répare la perte de session sous Brave/Chrome.
  const supabase = createMiddlewareClient({ req, res }, {
    cookieOptions: {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any, // le type de la v0.10 exige un champ "domain" ; la lib est dépréciée (migration vers @supabase/ssr à prévoir)
  })

  await supabase.auth.getSession()

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}