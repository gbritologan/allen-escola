import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Sair. POST porque encerrar sessão altera estado — um GET aqui deixaria
 * qualquer imagem `<img src="/sair">` derrubar a sessão de quem visita a página.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/entrar', request.nextUrl.origin), { status: 303 })
}
