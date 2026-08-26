'use client'

import Link, { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import { Assinatura, Marca } from '@/components/brand/marca'
import {
  IconeAjuda,
  IconeBuscar,
  IconeExplorar,
  IconeInicio,
  IconeJornada,
  IconeMapa,
  IconePainel,
} from '@/components/icons'
import { cn } from '@/lib/utils'

/**
 * CHROME DA ÁREA DO ALUNO — sidebar.
 *
 * REVISÃO DE D-21, a pedido do Gabriel e depois de ele usar o produto.
 *
 * A decisão original era não ter sidebar: um rail reserva 240px permanentes e
 * espreme o conteúdo, e a Allen é editorial, não painel de controle. O
 * argumento continua correto em abstrato — e errado aqui, por duas razões que
 * só apareceram com o produto na mão.
 *
 * A primeira: o catálogo cresceu de quatro destinos para seis, e barra
 * horizontal com seis itens vira sopa. A segunda, e a que decide: o Mapa
 * ocupa a tela inteira e é navegação constante. Com barra superior que some ao
 * rolar, sair do Mapa exigia rolar para cima primeiro. Uma sidebar fixa não
 * tem esse problema.
 *
 * O que fica da decisão antiga: RÓTULO EM TEXTO, sempre. Ícone aqui é âncora
 * visual numa lista vertical, nunca substituto de palavra. E no celular
 * continua o dock — sidebar em tela de 375px é o gesto errado.
 */

const DESTINOS = [
  { href: '/', label: 'Início', Icone: IconeInicio },
  { href: '/mapa', label: 'Mapa', Icone: IconeMapa },
  { href: '/explorar', label: 'Explorar', Icone: IconeExplorar },
  { href: '/jornada', label: 'Jornada', Icone: IconeJornada },
  { href: '/buscar', label: 'Buscar', Icone: IconeBuscar },
  { href: '/ajuda', label: 'Ajuda', Icone: IconeAjuda },
] as const

/** No celular só cabem quatro. Buscar e Ajuda vivem dentro das telas. */
const DOCK = DESTINOS.filter((d) => d.href !== '/buscar' && d.href !== '/ajuda')

function estaAtivo(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

/**
 * A RESPOSTA IMEDIATA AO CLIQUE.
 *
 * `usePathname` só muda quando a navegação COMPLETA. Entre o clique e a
 * resposta do servidor, a sidebar continuava mostrando o item antigo como
 * ativo — o clique parecia não ter pego. Era essa a sensação de "duro": não
 * falta de animação, falta de resposta.
 *
 * `useLinkStatus` sabe que o clique está em voo. O item acende na hora, e a
 * barrinha à esquerda cresce enquanto se espera. Se a resposta for rápida,
 * ninguém chega a ver — que é o comportamento certo para um indicador de
 * espera.
 */
function MarcaDeEspera() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return (
    <span
      aria-hidden
      className="absolute inset-y-1 left-0 w-[2px] origin-top rounded-full bg-blue-light [animation:esperar_600ms_var(--ease-allen)_infinite]"
    />
  )
}

/** O item da sidebar já se comporta como ativo enquanto o clique está em voo. */
function ItemDaSidebar({
  href,
  label,
  Icone,
  ativo,
}: {
  href: string
  label: string
  Icone: (props: { className?: string }) => React.ReactElement
  ativo: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? 'page' : undefined}
      className={cn(
        'relative flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-label transition-colors duration-150',
        ativo
          ? 'bg-[rgba(76,65,255,0.14)] text-ink'
          : 'text-ink-3 hover:bg-[rgba(243,245,252,0.05)] hover:text-ink-2 active:bg-[rgba(76,65,255,0.10)] active:text-ink',
      )}
    >
      <MarcaDeEspera />
      <Icone className={cn('size-[18px] shrink-0', ativo && 'text-blue-light')} />
      {label}
    </Link>
  )
}

export function StudentChrome({
  nome,
  email,
  ehEquipe,
}: {
  nome: string
  email: string | null
  ehEquipe: boolean
}) {
  const pathname = usePathname()

  return (
    <>
      {/* ---------- Sidebar (desktop) -------------------------------------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-navy-deep px-3 py-5 md:flex">
        <Link href="/" aria-label="Allen Escola" className="px-3 pb-6">
          <Assinatura size={21} />
        </Link>

        <span className="px-3 pb-2 text-caption uppercase tracking-[0.18em] text-ink-4">
          Sua escola
        </span>

        <nav className="flex flex-1 flex-col gap-0.5">
          {DESTINOS.map(({ href, label, Icone }) => (
            <ItemDaSidebar
              key={href}
              href={href}
              label={label}
              Icone={Icone}
              ativo={estaAtivo(pathname, href)}
            />
          ))}

          {ehEquipe && (
            <Link
              href="/admin"
              className="mt-2 flex items-center gap-3 rounded-[var(--radius-control)] border border-line px-3 py-2 text-label text-ink-3 transition-colors duration-150 hover:border-line-strong hover:text-ink"
            >
              <IconePainel className="size-[18px] shrink-0" />
              Admin
            </Link>
          )}
        </nav>

        {/* Quem está logado, e a saída. Sempre visível, como no rodapé de
            qualquer ferramenta que se usa horas seguidas. */}
        <div className="flex flex-col gap-2 border-t border-line px-3 pt-4">
          <Link href="/conta" className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-caption font-medium text-ink-2"
            >
              {nome.trim().charAt(0).toUpperCase() || '·'}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-caption text-ink-2">{nome}</span>
              {email && <span className="truncate text-caption text-ink-4">{email}</span>}
            </span>
          </Link>
          <form action="/sair" method="post">
            <button
              type="submit"
              className="px-0.5 text-caption text-ink-4 transition-colors hover:text-ink"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* ---------- Dock de vidro (celular) ---------------------------------
          Aqui o vidro é vidro de verdade: o conteúdo passa por baixo dele. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="liquid-glass mx-auto flex max-w-md items-stretch rounded-[var(--radius-panel)] p-1">
          {DOCK.map(({ href, label }) => {
            const ativo = estaAtivo(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={ativo ? 'page' : undefined}
                className={cn(
                  'flex-1 rounded-[calc(var(--radius-panel)-4px)] px-1 py-2.5 text-center text-caption transition-colors duration-150',
                  ativo ? 'bg-[rgba(76,65,255,0.16)] text-ink' : 'text-ink-3',
                )}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ---------- Barra do celular ---------------------------------------- */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-line bg-[rgba(5,7,20,0.82)] px-5 [backdrop-filter:blur(16px)] md:hidden">
        <Link href="/" aria-label="Allen Escola">
          <Marca size={19} />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/buscar" className="text-caption text-ink-3">
            Buscar
          </Link>
          <Link href="/ajuda" className="text-caption text-ink-3">
            Ajuda
          </Link>
          <Link
            href="/conta"
            aria-label="Sua conta"
            className="flex size-7 items-center justify-center rounded-full border border-line text-caption text-ink-2"
          >
            {nome.trim().charAt(0).toUpperCase() || '·'}
          </Link>
        </div>
      </header>
    </>
  )
}
