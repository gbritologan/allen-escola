import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Quem clicou no link do e-mail em vez de digitar o código cai aqui.
 *
 * Dois formatos, porque na prática os dois chegam:
 *
 *   ?code=…        fluxo PKCE — é o que o template PADRÃO do Supabase manda.
 *                  Tratar isso é o que permite entrar sem configurar nada.
 *   ?token_hash=…  é o formato que a gente prefere e vai deixar no template:
 *                  não expõe o token na URL e sobrevive a cliente de e-mail
 *                  que pré-carrega links.
 *
 * O `?token=` legado não é aceito de propósito.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  const destination = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(destination, origin))
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(destination, origin))
  }

  // Link velho, já usado ou adulterado. Volta ao login dizendo o motivo.
  const back = new URL('/entrar', origin)
  back.searchParams.set('erro', 'link-invalido')
  return NextResponse.redirect(back)
}
