'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Marca } from '@/components/brand/marca'
import { cn } from '@/lib/utils'

/**
 * CHROME DA ÁREA DO ALUNO (D-21).
 *
 * Sem sidebar. Um rail reserva 240px permanentes de chrome de aplicativo e
 * espreme o conteúdo numa coluna estreita — é esse gesto, não os ícones, que
 * faz um produto parecer painel de controle. A Allen é editorial.
 *
 * Restrições que vieram junto com a decisão, e que valem como requisito:
 *
 *   · os destinos ficam SEMPRE visíveis, com rótulo em TEXTO, nunca só ícone;
 *   · o dock mobile também leva rótulo;
 *   · nada existe apenas atrás de ⌘K — ele é atalho, não caminho único;
 *   · o único movimento é a barra sumir ao rolar para baixo e voltar ao rolar
 *     para cima, que é comportamento já aprendido em outros produtos.
 */

const DESTINOS = [
  { href: '/', label: 'Início' },
  { href: '/explorar', label: 'Explorar' },
  { href: '/jornada', label: 'Jornada' },
  { href: '/buscar', label: 'Buscar' },
] as const

/**
 * Ajuda fica fora de DESTINOS de propósito.
 *
 * No desktop ela vai à direita, junto da conta: é serviço, não destino de
 * navegação, e misturá-la com Explorar e Jornada dilui as quatro coisas que a
 * pessoa realmente vem fazer.
 *
 * No dock do celular ela entra como quinto item mesmo assim — no telefone não
 * existe "canto direito da barra", e ajuda que só aparece em outra tela não é
 * ajuda de fácil acesso.
 */
const AJUDA = { href: '/ajuda', label: 'Ajuda' } as const

function estaAtivo(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

export function StudentChrome({ nome }: { nome: string }) {
  const pathname = usePathname()
  const [escondida, setEscondida] = useState(false)
  const ultimoY = useRef(0)

  useEffect(() => {
    const aoRolar = () => {
      const y = window.scrollY
      // Margem de 6px: sem ela, um tremor no trackpad faz a barra piscar.
      if (Math.abs(y - ultimoY.current) < 6) return
      setEscondida(y > 80 && y > ultimoY.current)
      ultimoY.current = y
    }
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  return (
    <>
      {/* ---------- Barra superior ---------------------------------------- */}
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-40 hidden transition-transform duration-300 ease-[var(--ease-allen)] md:block',
          escondida && '-translate-y-full',
        )}
      >
        <div className="border-b border-line bg-[rgba(5,7,20,0.72)] [backdrop-filter:blur(16px)_saturate(140%)]">
          <nav className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-6">
            <Link href="/" aria-label="Allen Escola" className="shrink-0">
              <Marca size={20} />
            </Link>

            <div className="flex items-center gap-1">
              {DESTINOS.map((d) => {
                const ativo = estaAtivo(pathname, d.href)
                return (
                  <Link
                    key={d.href}
                    href={d.href}
                    aria-current={ativo ? 'page' : undefined}
                    className={cn(
                      'rounded-[var(--radius-control)] px-3 py-1.5 text-label transition-colors duration-150',
                      ativo
                        ? 'text-ink'
                        : 'text-ink-3 hover:bg-[rgba(243,245,252,0.05)] hover:text-ink-2',
                    )}
                  >
                    {d.label}
                  </Link>
                )
              })}
            </div>

            <div className="flex flex-1 items-center justify-end gap-4">
              <Link
                href={AJUDA.href}
                aria-current={estaAtivo(pathname, AJUDA.href) ? 'page' : undefined}
                className={cn(
                  'rounded-[var(--radius-control)] px-3 py-1.5 text-label transition-colors duration-150',
                  estaAtivo(pathname, AJUDA.href)
                    ? 'text-ink'
                    : 'text-ink-3 hover:bg-[rgba(243,245,252,0.05)] hover:text-ink-2',
                )}
              >
                {AJUDA.label}
              </Link>

              <Link
                href="/conta"
                className="flex size-8 items-center justify-center rounded-full border border-line text-caption font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
                aria-label="Sua conta"
                title={nome}
              >
                {nome.trim().charAt(0).toUpperCase() || '·'}
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* ---------- Dock de vidro (mobile) --------------------------------
          Aqui o vidro é vidro de verdade: o conteúdo passa por baixo dele. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="liquid-glass mx-auto flex max-w-md items-stretch rounded-[var(--radius-panel)] p-1">
          {[...DESTINOS, AJUDA].map((d) => {
            const ativo = estaAtivo(pathname, d.href)
            return (
              <Link
                key={d.href}
                href={d.href}
                aria-current={ativo ? 'page' : undefined}
                className={cn(
                  'flex-1 rounded-[calc(var(--radius-panel)-4px)] px-1 py-2.5 text-center text-caption transition-colors duration-150',
                  ativo ? 'bg-[rgba(76,65,255,0.16)] text-ink' : 'text-ink-3',
                )}
              >
                {d.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
