import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // 1. On prépare la réponse
  const res = NextResponse.next()

  // 2. On connecte Supabase à la requête ET à la réponse
  const supabase = createMiddlewareClient({ req, res })

  // 3. L'étape CRUCIALE : On force le rafraîchissement de la session
  // Cette ligne vérifie le cookie ET met à jour le navigateur si besoin
  await supabase.auth.getSession()

  // 4. On renvoie la réponse avec le cookie tout neuf
  return res
}

// On applique ce middleware sur tout le site sauf les fichiers statiques (images, etc.)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}