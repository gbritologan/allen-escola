import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { canOpenAdmin } from '@/core/identity/permissions'
import { roleFromClaim } from '@/core/identity/roles'

/**
 * Proxy (o antigo middleware — renomeado no Next 16).
 *
 * Faz duas coisas, e só:
 *   1. renova a sessão do Supabase a cada requisição;
 *   2. desvia o tráfego óbvio (visitante em rota privada, aluno em /admin).
 *
 * O item 2 é **conveniência**, não segurança. Quem autoriza é a RLS (D-11).
 * Se este arquivo sumisse, ninguém veria um dado a mais — só telas de erro
 * mais feias.
 */

const PUBLIC_PREFIXES = [
  '/entrar',
  // Termos e privacidade abrem sem conta: quem está decidindo se assina, e
  // quem quer conferir o que aceitou, não deveria precisar de login para ler
  // as regras.
  '/termos',
  '/privacidade',
  '/auth',
  '/_next',
  '/favicon',
  '/brand',
  // Em produção `/design` NÃO é público: a própria página confere se quem
  // abriu é da equipe. Em desenvolvimento ele passa direto, porque quem subiu
  // o servidor já é a equipe.
  ...(process.env.NODE_ENV === 'production' ? [] : ['/design']),
]

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
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // getUser() valida o token no servidor. getSession() só lê o cookie e não
  // serve para decidir nada.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/entrar'
    // Depois de entrar, a pessoa volta para onde queria ir.
    url.searchParams.set('destino', pathname)
    return NextResponse.redirect(url)
  }

  if (user && pathname.startsWith('/admin')) {
    /*
     * O PAPEL VEM DA CLAIM, E CAI PARA `profiles` QUANDO ELA NÃO EXISTE.
     *
     * Este era o bug: o proxy lia SÓ `app_metadata.allen_role`. Essa claim só
     * existe se o hook de token estiver ligado no painel do Supabase — e ele
     * não está. Resultado: `roleFromClaim(undefined)` devolve 'student', e o
     * admin era redirecionado do /admin para a Home.
     *
     * O sintoma é cruel porque não parece erro: a pessoa clica em "Admin" e vê
     * a Início. Nenhuma mensagem, nenhum 403 — parece que o botão não faz nada.
     *
     * `getSession()` já tinha esse fallback (era a mesma armadilha, e estava
     * documentada lá). O proxy ficou para trás, e como ele roda ANTES da
     * página, a correção de lá nunca chegava a rodar.
     *
     * O SELECT extra só acontece em rota /admin e só quando a claim falta —
     * ligar o hook no painel elimina a consulta sozinho.
     */
    const claim = user.app_metadata?.['allen_role']
    let role = roleFromClaim(claim)

    if (!claim) {
      const { data: perfil } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      role = roleFromClaim(perfil?.role)
    }

    if (!canOpenAdmin(role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Tudo, menos arquivos estáticos e imagens — que não têm sessão para
     * renovar e pagariam o custo à toa.
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|robots.txt|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)',
  ],
}
