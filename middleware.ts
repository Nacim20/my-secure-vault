import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // 1. On initialise Supabase côté serveur
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // 2. Si l'utilisateur n'est PAS connecté
  if (!session) {
    // S'il essaie d'aller sur une page protégée (tout sauf login/auth)
    if (!req.nextUrl.pathname.startsWith('/login') && !req.nextUrl.pathname.startsWith('/auth')) {
      // On le force à aller sur Login
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // 3. Si l'utilisateur EST connecté
  if (session) {
    // S'il essaie d'aller sur Login alors qu'il est déjà connecté
    if (req.nextUrl.pathname.startsWith('/login')) {
      // On le renvoie vers l'accueil (ou dashboard)
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Protège toutes les routes sauf :
     * - _next/static (fichiers statiques)
     * - _next/image (images optimisées)
     * - favicon.ico
     * - Les fichiers publics (si tu en as)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}