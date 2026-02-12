import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // On utilise "as any" pour contourner l'erreur TypeScript de la version 0.10.0
  // Cela permet de forcer l'option "sameSite: lax" qui répare Brave/Chrome
  const supabase = createMiddlewareClient({ req, res }, {
    cookieOptions: {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/', 
    } as any 
  })

  await supabase.auth.getSession()

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}